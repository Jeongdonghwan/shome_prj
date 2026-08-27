# -*- coding: utf-8 -*-
"""PyMySQL 직접 사용 (ORM 없음). 요청당 커넥션은 app.py의 teardown에서 정리."""
import pymysql
from flask import current_app, g

STATUSES = ("신규", "상담중", "완료", "보류")
PER_PAGE = 20


def get_db():
    if "db" not in g:
        cfg = current_app.config
        g.db = pymysql.connect(
            host=cfg["DB_HOST"],
            port=cfg["DB_PORT"],
            user=cfg["DB_USER"],
            password=cfg["DB_PASSWORD"],
            database=cfg["DB_NAME"],
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False,
        )
    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def create_inquiry(name, phone, addr, size, services, hope_date, memo, agreed, ip_address):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            "INSERT INTO inquiries"
            " (name, phone, addr, size, services, hope_date, memo, agreed, ip_address)"
            " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (name, phone, addr or None, size or None, services or None,
             hope_date, memo or None, 1 if agreed else 0, ip_address),
        )
    db.commit()


def recent_inquiry_exists(ip_address, seconds):
    """같은 IP가 seconds초 내에 제출한 이력이 있으면 True (스팸 방지).

    DB 기반이라 gunicorn 워커가 여러 개여도 정상 동작한다.
    """
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM inquiries"
            " WHERE ip_address = %s AND created_at > NOW() - INTERVAL %s SECOND LIMIT 1",
            (ip_address, seconds),
        )
        return cur.fetchone() is not None


def list_inquiries(status=None, page=1, per_page=PER_PAGE):
    db = get_db()
    where, params = "", []
    if status in STATUSES:
        where = " WHERE status = %s"
        params.append(status)
    with db.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS cnt FROM inquiries" + where, params)
        total = cur.fetchone()["cnt"]
        cur.execute(
            "SELECT * FROM inquiries" + where
            + " ORDER BY created_at DESC, id DESC LIMIT %s OFFSET %s",
            params + [per_page, (page - 1) * per_page],
        )
        rows = cur.fetchall()
    return rows, total


def export_inquiries(status=None):
    """엑셀 다운로드용 — 페이지네이션 없이 필터에 맞는 전체 행."""
    db = get_db()
    where, params = "", []
    if status in STATUSES:
        where = " WHERE status = %s"
        params.append(status)
    with db.cursor() as cur:
        cur.execute(
            "SELECT * FROM inquiries" + where + " ORDER BY created_at DESC, id DESC",
            params,
        )
        return cur.fetchall()


def count_new():
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS cnt FROM inquiries WHERE status = '신규'")
        return cur.fetchone()["cnt"]


def get_inquiry(inquiry_id):
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT * FROM inquiries WHERE id = %s", (inquiry_id,))
        return cur.fetchone()


def update_inquiry(inquiry_id, status, admin_memo):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            "UPDATE inquiries SET status = %s, admin_memo = %s WHERE id = %s",
            (status, admin_memo or None, inquiry_id),
        )
    db.commit()
