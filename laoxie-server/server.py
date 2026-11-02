#!/usr/bin/env python3
"""老谢手工面服务器版 - 在 Mac 上运行,顾客手机和老板手机都连这台服务器.
只用 Python 标准库,不用另外装东西.
启动: python3 server.py  (默认端口 8000)
顾客入口: http://<Mac地址>:8000/order.html
老板后厨: http://<Mac地址>:8000/kitchen.html
老板后台: http://<Mac地址>:8000/admin.html
顾客页面里没有任何后厨/后台入口,两套是分开的.
"""
import json, os, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")
PUBLIC = os.path.join(BASE, "public")
LOCK = threading.Lock()

def load(name, default):
    p = os.path.join(DATA, name)
    if not os.path.exists(p):
        return default
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def save(name, obj):
    p = os.path.join(DATA, name)
    with LOCK:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PUBLIC, **kw)
    def log_message(self, *a):
        pass
    def send_json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)
    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n).decode("utf-8") or "{}") if n else {}
    def do_GET(self):
        u = urlparse(self.path).path
        if u == "/":
            self.send_response(302); self.send_header("Location", "/order.html"); self.end_headers(); return
        if u == "/api/ping":
            return self.send_json({"ok": True})
        if u == "/api/menu":
            return self.send_json(load("menu.json", []))
        if u == "/api/settings":
            return self.send_json(load("settings.json", {}))
        if u == "/api/orders":
            return self.send_json(load("orders.json", []))
        return super().do_GET()
    def do_POST(self):
        u = urlparse(self.path).path
        try:
            body = self.read_json()
        except Exception as e:
            return self.send_json({"ok": False, "error": str(e)}, 400)
        if u == "/api/settings":
            cur = load("settings.json", {})
            cur.update(body)
            save("settings.json", cur)
            return self.send_json({"ok": True, "settings": cur})
        if u == "/api/orders":
            menu = {m["name"]: m for m in load("menu.json", [])}
            settings = load("settings.json", {})
            sold = set(settings.get("soldout") or [])
            items, total = [], 0
            for it in body.get("items") or []:
                m = menu.get(it.get("name"))
                if not m or m["name"] in sold:
                    continue
                q = int(it.get("qty") or 0)
                if q <= 0:
                    continue
                items.append({"name": m["name"], "price": m["price"], "unit": m.get("unit", ""), "qty": q})
                total += m["price"] * q
            if not items:
                return self.send_json({"ok": False, "error": "empty or soldout"}, 400)
            if body.get("mode") != "堂食":
                total += 1  # 店内告示:打包餐盒加1元
            orders = load("orders.json", [])
            no = str(len(orders) + 1).zfill(3)
            o = {"no": no, "mode": body.get("mode", "堂食"), "seat": body.get("seat", ""),
                 "people": body.get("people", ""), "arrive": body.get("arrive", ""),
                 "address": body.get("address", ""), "phone": body.get("phone", ""),
                 "items": items, "total": total, "status": "待付款", "time": body.get("time", "")}
            orders.append(o); save("orders.json", orders)
            return self.send_json({"ok": True, "order": o})
        if u.startswith("/api/orders/") and u.endswith("/pay"):
            no = u.split("/")[3]
            orders = load("orders.json", [])
            for o in orders:
                if o["no"] == no and o["status"] == "待付款":
                    o["status"] = "待老板确认"; save("orders.json", orders)
                    return self.send_json({"ok": True, "order": o})
            return self.send_json({"ok": False, "error": "not found"}, 404)
        if u.startswith("/api/orders/") and u.endswith("/status"):
            no = u.split("/")[3]
            orders = load("orders.json", [])
            for o in orders:
                if o["no"] == no:
                    o["status"] = body.get("status", o["status"]); save("orders.json", orders)
                    return self.send_json({"ok": True, "order": o})
            return self.send_json({"ok": False, "error": "not found"}, 404)
        return self.send_json({"ok": False, "error": "unknown route"}, 404)

if __name__ == "__main__":
    os.makedirs(DATA, exist_ok=True)
    if not os.path.exists(os.path.join(DATA, "orders.json")):
        save("orders.json", [])
    port = int(os.environ.get("PORT", "8000"))
    print(f"老谢手工面服务器已启动,端口 {port}")
    print("顾客: /order.html  后厨: /kitchen.html  后台: /admin.html")
    ThreadingHTTPServer(("0.0.0.0", port), H).serve_forever()
