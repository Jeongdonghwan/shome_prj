# 세담홈케어 배포 (카페24 멀티사이트 서버)

- 서버: `211.45.175.195` (root, MobaXterm)
- 프로젝트명: `sedamhome` / 배포 경로: `/var/www/sedamhome` / **포트 8033**
- 스택: Flask + gunicorn + MariaDB + systemd, nginx 리버스프록시

---

## 블록 1 — 포트 확인 + 코드 + 환경 + systemd 유닛

```bash
ss -tlnp | grep ':8033 ' && echo "!! 8033 사용중" || echo "8033 비어있음 OK"

cd /var/www && git clone https://github.com/Jeongdonghwan/shome_prj.git sedamhome && cd sedamhome
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt

cp .env.example .env
sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$(openssl rand -hex 24)|" .env
sed -i "s|^DB_USER=.*|DB_USER=sedamhome|" .env
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=1234|" .env
sed -i "s|^ADMIN_ID=.*|ADMIN_ID=admin|" .env
sed -i "s|^ADMIN_PW=.*|ADMIN_PW=1234|" .env
sed -i "s|^SITE_URL=.*|SITE_URL=https://sedamhome.com|" .env
cat .env

cat > /etc/systemd/system/sedamhome.service <<'EOF'
[Unit]
Description=SEDAMHOME Flask (gunicorn :8033)
After=network.target mariadb.service

[Service]
WorkingDirectory=/var/www/sedamhome
ExecStart=/var/www/sedamhome/venv/bin/gunicorn -w 2 -b 0.0.0.0:8033 app:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
```

> `SECRET_KEY`는 반드시 고정값이어야 한다. 비워두면 gunicorn 워커(-w 2)마다 키가 달라져
> 어드민 로그인이 계속 튕긴다.

## 블록 2 — DB (root 비밀번호 입력 필요)

```bash
cd /var/www/sedamhome && mysql -u root -p < schema.sql
mysql -u root -p -e "CREATE USER IF NOT EXISTS 'sedamhome'@'localhost'; ALTER USER 'sedamhome'@'localhost' IDENTIFIED BY '1234'; GRANT ALL PRIVILEGES ON sedamhome.* TO 'sedamhome'@'localhost'; FLUSH PRIVILEGES;"
mysql -u sedamhome -p1234 -e "USE sedamhome; SHOW TABLES;"
```

기대 출력: `inquiries`

## 블록 3 — 기동·검증

```bash
systemctl enable --now sedamhome && systemctl status sedamhome --no-pager
curl -s http://127.0.0.1:8033/ | grep -o "<title>[^<]*</title>"
curl -s -o /dev/null -w "admin:%{http_code}\n" http://127.0.0.1:8033/admin/inquiries
curl -s -o /dev/null -w "svc:%{http_code}\n" http://127.0.0.1:8033/입주청소/
curl -s http://127.0.0.1:8033/sitemap.xml | grep -c "<loc>"
ufw status | head -1
```

기대 출력: `active (running)` / `<title>세담홈케어 홈페이지</title>` / `admin:302` / `svc:200` / `7`

실패 시: `journalctl -u sedamhome -n 30 --no-pager`
`ufw`가 active면 `ufw allow 8033/tcp`.

접속: `http://211.45.175.195:8033` · 어드민 `http://211.45.175.195:8033/admin/inquiries`

## 블록 4 — 도메인 연결

> **먼저 DNS부터.** `sedamhome.com` A레코드가 지금은 GitHub Pages를 가리킨다.
> `211.45.175.195`로 변경하고 전파된 뒤에야 certbot이 성공한다.

```bash
dig +short sedamhome.com     # 211.45.175.195 나와야 함

cat > /etc/nginx/sites-available/sedamhome <<'EOF'
server {
    listen 80;
    server_name sedamhome.com www.sedamhome.com;
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8033;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/sedamhome /etc/nginx/sites-enabled/sedamhome
nginx -t && systemctl reload nginx

apt install -y certbot python3-certbot-nginx
certbot --nginx -d sedamhome.com -d www.sedamhome.com --agree-tos -m jdhwan0227@gmail.com --redirect -n

systemctl restart sedamhome
curl -sI https://sedamhome.com | head -3
curl -s https://sedamhome.com/robots.txt
```

- `X-Forwarded-For`가 있어야 앱의 `client_ip()`가 실제 IP를 기록한다
  (견적 문의 1분 중복 제출 제한이 정상 동작).
- 프록시 연결 후 `ufw delete allow 8033/tcp`로 직접 포트 노출 차단 권장.

## 시나리오 B: 업데이트 배포

```bash
cd /var/www/sedamhome && git pull && systemctl restart sedamhome && systemctl status sedamhome --no-pager
```

CSS/JS만 바뀌었으면 브라우저에서 Ctrl+F5.

---

## 전환 후 정리 (DNS 전환·검증 완료 뒤에)

지금 프로젝트 루트의 아래 파일들은 **GitHub Pages가 서비스 중인 기존 정적 사이트**다.
Flask는 `templates/`를 사용하므로 이 파일들을 읽지 않는다. 전환이 완전히 끝난 뒤에 정리한다.

```
index.html
robots.txt / sitemap.xml
입주청소/ 이사청소/ 줄눈시공/ 나노코팅/ 탄성코트/ 새집증후군/
CNAME.txt          ← GitHub Pages 전용
```

유지해야 하는 루트 파일 (Flask가 `ROOT_FILES`로 서비스):

```
favicon.ico, favicon-16x16.png, favicon-32x32.png
naver0d22fcc1e1868a8406f0afc8f06206a1.html
```

## 로컬 실행

```bash
python -m venv venv && venv/Scripts/pip install -r requirements.txt
mysql -u root -p < schema.sql
cp .env.example .env     # DB_USER=root / DB_PASSWORD / ADMIN_ID / ADMIN_PW 채우기
venv/Scripts/python app.py    # http://127.0.0.1:5000
```
