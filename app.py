# -*- coding: utf-8 -*-
"""세담홈케어(SEDAMHOME) 홈페이지 — Flask 앱 팩토리 + 라우트.

static_folder를 기존 정적 사이트의 'assets' 그대로 지정한다.
그래야 index.html의 './assets/...' 와 하위페이지의 '../assets/...' 가
수정 없이 그대로 동작한다.
"""
import csv
import io
import math
import re
import time
from datetime import datetime
from functools import wraps
from urllib.parse import quote

from flask import (
    Flask, abort, jsonify, redirect, render_template, request, send_from_directory,
    session, url_for, Response,
)

import models
from config import Config

PHONE_RE = re.compile(r"^[0-9-]+$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# URL은 기존 정적 사이트와 100% 동일하게 유지한다 (네이버/구글 색인 보존)
SERVICE_PAGES = ("입주청소", "이사청소", "줄눈시공", "나노코팅", "탄성코트", "새집증후군")

# 네이버 서치어드바이저 소유확인 파일
NAVER_VERIFY_FILE = "naver0d22fcc1e1868a8406f0afc8f06206a1.html"

# 프로젝트 루트에서 그대로 서비스하는 파일들.
# 템플릿이 './favicon.ico', '../favicon.ico' 로 참조하므로 둘 다 '/favicon.ico'가 된다.
ROOT_FILES = (
    "favicon.ico",
    "favicon-16x16.png",
    "favicon-32x32.png",
    NAVER_VERIFY_FILE,
)


def client_ip():
    """nginx 리버스프록시 뒤에서는 X-Forwarded-For 첫 값을 사용."""
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()[:45]
    return (request.remote_addr or "")[:45]


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


def create_app():
    app = Flask(__name__, static_folder="assets", static_url_path="/assets")
    app.config.from_object(Config)
    app.teardown_appcontext(models.close_db)

    # ─── 공개 ───────────────────────────────────────────────

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/<slug>/")
    @app.get("/<slug>/index.html")
    def service_page(slug):
        if slug not in SERVICE_PAGES:
            abort(404)
        return render_template("services/%s.html" % slug)

    @app.get("/<filename>")
    def root_file(filename):
        """파비콘·네이버 소유확인 파일 등 루트에 있어야 하는 파일.

        이 규칙이 '/입주청소'(슬래시 없는 형태)까지 잡아버리므로,
        서비스 슬러그면 정식 URL로 308 리다이렉트한다.
        """
        if filename in SERVICE_PAGES:
            # url_for는 마지막 등록 규칙(/index.html)을 고르므로 직접 만든다
            return redirect("/%s/" % quote(filename), code=308)
        if filename not in ROOT_FILES:
            abort(404)
        return send_from_directory(app.root_path, filename)

    @app.post("/inquiry")
    def inquiry():
        form = request.form
        # honeypot: 봇이 채우면 저장하지 않고 성공한 척 응답
        if form.get("website", "").strip():
            return jsonify(ok=True)

        name = form.get("name", "").strip()
        phone = form.get("phone", "").strip()
        addr = form.get("addr", "").strip()
        size = form.get("size", "").strip()
        services = form.get("services", "").strip()
        memo = form.get("memo", "").strip()
        agreed = form.get("agree", "").strip() != ""

        if not name or not phone:
            return jsonify(ok=False, error="이름과 연락처는 필수입니다."), 400
        if not PHONE_RE.fullmatch(phone):
            return jsonify(ok=False, error="연락처는 숫자와 하이픈(-)만 입력해주세요."), 400
        if not agreed:
            return jsonify(ok=False, error="개인정보 수집·이용에 동의해주세요."), 400
        if len(name) > 50 or len(phone) > 30 or len(addr) > 120 or len(size) > 20 \
                or len(services) > 255 or len(memo) > 2000:
            return jsonify(ok=False, error="입력값이 너무 깁니다."), 400

        hope_date = form.get("hope_date", "").strip()
        if not DATE_RE.fullmatch(hope_date):
            hope_date = None

        ip = client_ip()
        if models.recent_inquiry_exists(ip, app.config["INQUIRY_RATE_LIMIT_SECONDS"]):
            return jsonify(ok=False, error="잠시 후 다시 시도해주세요. (1분 내 중복 제출 제한)"), 429

        models.create_inquiry(name, phone, addr, size, services, hope_date, memo, agreed, ip)
        return jsonify(ok=True)

    # ─── SEO ────────────────────────────────────────────────

    def site_url():
        return (app.config.get("SITE_URL") or request.url_root.rstrip("/"))

    @app.get("/robots.txt")
    def robots():
        body = (
            "User-agent: *\n"
            "Allow: /\n"
            "Disallow: /admin/\n"
            "Sitemap: %s/sitemap.xml\n" % site_url()
        )
        return Response(body, mimetype="text/plain")

    @app.get("/sitemap.xml")
    def sitemap():
        base = site_url()
        urls = ['  <url><loc>%s/</loc><changefreq>weekly</changefreq>'
                '<priority>1.0</priority></url>' % base]
        for slug in SERVICE_PAGES:
            urls.append('  <url><loc>%s/%s/</loc><changefreq>monthly</changefreq>'
                        '<priority>0.8</priority></url>' % (base, slug))
        body = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "\n".join(urls) + "\n</urlset>\n"
        )
        return Response(body, mimetype="application/xml")

    # ─── 어드민 ─────────────────────────────────────────────

    @app.route("/admin/login", methods=["GET", "POST"])
    def admin_login():
        error = None
        # 세션 기반 잠금: 실패 5회 → 10분
        locked_until = session.get("login_locked_until", 0)
        if time.time() < locked_until:
            remain = int((locked_until - time.time()) / 60) + 1
            error = "로그인이 잠겼습니다. 약 %d분 후 다시 시도해주세요." % remain
            return render_template("admin/login.html", error=error), 423

        if request.method == "POST":
            admin_id = app.config.get("ADMIN_ID")
            admin_pw = app.config.get("ADMIN_PW")
            if not admin_id or not admin_pw:
                error = "관리자 계정이 설정되지 않았습니다. (.env의 ADMIN_ID/ADMIN_PW)"
            elif (request.form.get("admin_id", "") == admin_id
                  and request.form.get("admin_pw", "") == admin_pw):
                session.clear()
                session["admin_logged_in"] = True
                nxt = request.args.get("next", "")
                if not nxt.startswith("/admin"):
                    nxt = url_for("admin_inquiries")
                return redirect(nxt)
            else:
                fails = session.get("login_fails", 0) + 1
                session["login_fails"] = fails
                if fails >= app.config["LOGIN_MAX_FAILS"]:
                    session["login_locked_until"] = time.time() + app.config["LOGIN_LOCK_SECONDS"]
                    session["login_fails"] = 0
                    error = "로그인 5회 실패로 10분간 잠겼습니다."
                else:
                    error = "아이디 또는 비밀번호가 올바르지 않습니다. (%d/%d)" % (
                        fails, app.config["LOGIN_MAX_FAILS"])
        return render_template("admin/login.html", error=error)

    @app.get("/admin/logout")
    def admin_logout():
        session.clear()
        return redirect(url_for("admin_login"))

    @app.get("/admin")
    @app.get("/admin/")
    @login_required
    def admin_root():
        return redirect(url_for("admin_inquiries"))

    @app.get("/admin/inquiries")
    @login_required
    def admin_inquiries():
        status = request.args.get("status", "")
        if status not in models.STATUSES:
            status = ""
        try:
            page = max(1, int(request.args.get("page", "1")))
        except ValueError:
            page = 1
        rows, total = models.list_inquiries(status or None, page)
        pages = max(1, math.ceil(total / models.PER_PAGE))
        return render_template(
            "admin/inquiries.html",
            rows=rows, total=total, page=page, pages=pages,
            status=status, statuses=models.STATUSES, new_count=models.count_new(),
        )

    @app.get("/admin/inquiries/export")
    @login_required
    def admin_export():
        """엑셀(CSV) 다운로드. 현재 보고 있는 상태 필터를 그대로 적용한다."""
        status = request.args.get("status", "")
        if status not in models.STATUSES:
            status = ""
        rows = models.export_inquiries(status or None)

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["No", "접수일시", "이름", "연락처", "지역/단지명", "평수",
                    "원하는 서비스", "희망 시공일", "추가 요청사항",
                    "상태", "관리자 메모", "동의", "접수IP"])
        for r in rows:
            w.writerow([
                r["id"],
                r["created_at"].strftime("%Y-%m-%d %H:%M:%S") if r["created_at"] else "",
                r["name"],
                r["phone"],
                r["addr"] or "",
                r["size"] or "",
                r["services"] or "",
                r["hope_date"].strftime("%Y-%m-%d") if r["hope_date"] else "",
                r["memo"] or "",
                r["status"],
                r["admin_memo"] or "",
                "동의" if r["agreed"] else "미동의",
                r["ip_address"] or "",
            ])

        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = "세담홈케어_견적문의%s_%s.csv" % (("_" + status) if status else "", stamp)
        # HTTP 헤더는 latin-1만 담을 수 있다. ASCII 폴백 + RFC 5987 인코딩을 함께 준다.
        ascii_name = "sedamhome_inquiries_%s.csv" % stamp
        disposition = "attachment; filename=%s; filename*=UTF-8''%s" % (
            ascii_name, quote(filename))

        # 앞의 ﻿(UTF-8 BOM)이 있어야 엑셀에서 한글이 깨지지 않는다
        return Response(
            "﻿" + buf.getvalue(),
            mimetype="text/csv; charset=utf-8",
            headers={"Content-Disposition": disposition},
        )

    @app.get("/admin/inquiries/<int:inquiry_id>")
    @login_required
    def admin_inquiry_detail(inquiry_id):
        row = models.get_inquiry(inquiry_id)
        if row is None:
            abort(404)
        saved = request.args.get("saved") == "1"
        return render_template(
            "admin/inquiry_detail.html", row=row, statuses=models.STATUSES, saved=saved,
        )

    @app.post("/admin/inquiries/<int:inquiry_id>/update")
    @login_required
    def admin_inquiry_update(inquiry_id):
        row = models.get_inquiry(inquiry_id)
        if row is None:
            abort(404)
        status = request.form.get("status", "")
        if status not in models.STATUSES:
            abort(400)
        models.update_inquiry(inquiry_id, status, request.form.get("admin_memo", "").strip())
        return redirect(url_for("admin_inquiry_detail", inquiry_id=inquiry_id, saved=1))

    return app


app = create_app()

if __name__ == "__main__":
    import os
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=True)
