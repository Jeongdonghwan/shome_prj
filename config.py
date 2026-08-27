# -*- coding: utf-8 -*-
"""환경변수 우선 설정. .env 파일이 있으면 로드한다 (.env.example 참고)."""
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Config:
    # gunicorn -w 2 이상에서는 반드시 고정값이어야 한다.
    # 미설정 시 워커마다 키가 달라져 어드민 로그인이 튕긴다.
    SECRET_KEY = os.environ.get("SECRET_KEY") or os.urandom(24).hex()

    DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.environ.get("DB_PORT", "3306"))
    DB_NAME = os.environ.get("DB_NAME", "sedamhome")
    DB_USER = os.environ.get("DB_USER", "root")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "")

    # 관리자 계정 — 반드시 환경변수로 설정 (기본값 없음)
    ADMIN_ID = os.environ.get("ADMIN_ID")
    ADMIN_PW = os.environ.get("ADMIN_PW")

    # SEO: 배포 도메인 (sitemap/robots 용). 미설정 시 요청 host 사용
    SITE_URL = os.environ.get("SITE_URL")

    # 카카오톡 채널 URL
    KAKAO_CHANNEL_URL = os.environ.get("KAKAO_CHANNEL_URL", "https://pf.kakao.com/_qUgkn")

    # 스팸 방지: 같은 IP 재제출 차단 간격(초)
    INQUIRY_RATE_LIMIT_SECONDS = 60

    # 로그인 잠금: 실패 허용 횟수 / 잠금 시간(초)
    LOGIN_MAX_FAILS = 5
    LOGIN_LOCK_SECONDS = 600
