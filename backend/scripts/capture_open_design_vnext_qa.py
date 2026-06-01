from __future__ import annotations

import argparse
import base64
import json
import os
import socket
import struct
import sys
import time
import urllib.parse
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import requests

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.seeds.demo import (  # noqa: E402
    DEMO_PASSWORD,
    OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL,
    OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL,
    OPEN_DESIGN_VNEXT_STAGE_ONE_QA_STUDENT_EMAIL,
    OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_STUDENT_EMAIL,
    seed_open_design_vnext_late_qa_data,
    seed_open_design_vnext_qa_data,
    seed_open_design_vnext_stage_one_qa_data,
    seed_open_design_vnext_stage_two_guide_qa_data,
)

DEFAULT_API_BASE = "http://127.0.0.1:18002"
DEFAULT_CDP_BASE = "http://127.0.0.1:9224"
DEFAULT_OUTPUT_DIR = "/private/tmp/edufde-vnext-qa-captures"
DEFAULT_PROD_BASE = "http://127.0.0.1:3001"
DEFAULT_REF_BASE = "http://127.0.0.1:4175"
STORAGE_TOKEN_KEY = "edufde_access_token"
TEACHER_EMAIL = "teacher@edufde.demo"
ADMIN_EMAIL = "admin@edufde.demo"

HTTP = requests.Session()
HTTP.trust_env = False

ROUND_ONE_STUDENT_EMAIL = OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL
ROUND_TWO_STAGE_ONE_STUDENT_EMAIL = OPEN_DESIGN_VNEXT_STAGE_ONE_QA_STUDENT_EMAIL


@dataclass(frozen=True)
class CaptureResult:
    name: str
    path: Path
    url: str
    bytes: int


REFERENCE_PAGES: tuple[tuple[str, str], ...] = (
    ("round0-ref-login-entry", "/index.html#login-entry"),
    ("round0-ref-login", "/login.html"),
    ("round1-ref-student-home", "/screens/student-home.html"),
    ("round1-ref-experiment-detail", "/screens/student-experiment-detail.html"),
    ("round1-ref-student-project", "/screens/05-student-project.html"),
    ("round2-ref-interview-guide", "/screens/06-interview-guide.html"),
    ("round2-ref-interview-lab", "/screens/06-interview-lab.html"),
    ("round2-ref-interview-submit", "/screens/06-interview-submit.html"),
    ("round3-ref-solution-guide", "/screens/07-solution-guide.html"),
    ("round3-ref-solution-definition", "/screens/07-solution-definition.html"),
    ("round4-ref-knowledge-decision", "/screens/08-knowledge-decision.html"),
    ("round4-ref-rag-data-quality", "/screens/08-rag-data-quality.html"),
    ("round4-ref-rag-cleaning", "/screens/08-rag-cleaning.html"),
    ("round4-ref-rag-structure", "/screens/08-rag-structure.html"),
    ("round4-ref-rag-chunking", "/screens/08-rag-chunking.html"),
    ("round4-ref-rag-vector-storage", "/screens/08-rag-vector-storage.html"),
    ("round4-ref-rag-retrieval", "/screens/08-rag-retrieval.html"),
    ("round4-ref-rag-answer-citation", "/screens/08-rag-answer-citation.html"),
    ("round4-ref-rag-recall-test", "/screens/08-rag-recall-test.html"),
    ("round4-ref-rag-risk-boundary", "/screens/08-rag-risk-boundary.html"),
    ("round5-ref-agent-guide", "/screens/09-agent-guide.html"),
    ("round5-ref-dify-onboarding", "/screens/09-dify-onboarding.html"),
    ("round5-ref-agent-build-test", "/screens/09-agent-build-test.html"),
    ("round5-ref-agent-test-score", "/screens/09-agent-test-score.html"),
    ("round6-ref-delivery-document", "/screens/10-delivery-document.html"),
    ("round6-ref-delivery-acceptance", "/screens/10-delivery-acceptance.html"),
    ("round7-ref-portfolio-report", "/screens/12-portfolio-report.html"),
    ("round8-ref-ai-review-rubric", "/screens/11-ai-review-rubric.html"),
    ("round8-ref-teacher-dashboard", "/screens/01-teacher-dashboard.html"),
    ("round8-ref-admin-deployment", "/screens/13-admin-deployment.html"),
)

PRODUCTION_PUBLIC_PAGES: tuple[tuple[str, str], ...] = (
    ("round0-prod-login-entry", "/#login-entry"),
    ("round0-prod-login", "/login"),
)

PRODUCTION_PUBLIC_WAIT_TEXT: dict[str, str] = {
    "round0-prod-login-entry": "让 AI 项目实训",
    "round0-prod-login": "登录平台",
}

LATE_STAGE_FOUR_STEPS: tuple[tuple[str, int, str], ...] = (
    ("round5-prod-agent-guide-late", 0, "把知识库决策转成可运行的质检智能体"),
    ("round5-prod-dify-onboarding-late", 1, "把 Dify 从工具名词变成可控的搭建流程"),
    ("round5-prod-agent-build-test-late", 2, "把阶段三决策落到 Dify 应用配置"),
    ("round5-prod-agent-test-score-late", 3, "用平台测试集验证 Dify 智能体是否达到交付门槛"),
)


class WebSocket:
    def __init__(self, url: str):
        parsed = urllib.parse.urlparse(url)
        self.host = parsed.hostname or "127.0.0.1"
        self.port = parsed.port or 80
        self.path = parsed.path + (("?" + parsed.query) if parsed.query else "")
        self.sock = socket.create_connection((self.host, self.port), timeout=10)
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        request = (
            f"GET {self.path} HTTP/1.1\r\n"
            f"Host: {self.host}:{self.port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(request.encode("ascii"))
        data = b""
        while b"\r\n\r\n" not in data:
            data += self.sock.recv(4096)
        if b" 101 " not in data.split(b"\r\n", 1)[0]:
            raise RuntimeError(data.decode("latin1", errors="replace"))

    def send_json(self, payload: dict[str, object]) -> None:
        raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        header = bytearray([0x81])
        if len(raw) < 126:
            header.append(0x80 | len(raw))
        elif len(raw) < 65536:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", len(raw)))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", len(raw)))
        mask = os.urandom(4)
        header.extend(mask)
        masked = bytes(byte ^ mask[index % 4] for index, byte in enumerate(raw))
        self.sock.sendall(bytes(header) + masked)

    def recv_json(self) -> dict[str, object]:
        first = self.sock.recv(2)
        if not first:
            raise RuntimeError("websocket closed")
        opcode = first[0] & 0x0F
        length = first[1] & 0x7F
        if length == 126:
            length = struct.unpack("!H", self.sock.recv(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", self.sock.recv(8))[0]
        masked = first[1] & 0x80
        mask = self.sock.recv(4) if masked else b""
        payload = b""
        while len(payload) < length:
            payload += self.sock.recv(length - len(payload))
        if masked:
            payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        if opcode == 8:
            raise RuntimeError("websocket close frame")
        if opcode == 9:
            return self.recv_json()
        return json.loads(payload.decode("utf-8"))

    def close(self) -> None:
        self.sock.close()


class Page:
    def __init__(self, cdp_base: str, *, width: int = 1440, height: int = 900):
        self.cdp_base = cdp_base.rstrip("/")
        self.ws = WebSocket(self._create_target())
        self.next_id = 1
        self.call("Page.enable")
        self.call("Runtime.enable")
        self.call(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": width,
                "height": height,
                "deviceScaleFactor": 1,
                "mobile": False,
            },
        )

    def _create_target(self) -> str:
        response = HTTP.put(f"{self.cdp_base}/json/new", timeout=5)
        response.raise_for_status()
        return response.json()["webSocketDebuggerUrl"]

    def call(
        self,
        method: str,
        params: dict[str, object] | None = None,
        *,
        timeout: int = 20,
    ) -> dict[str, object]:
        command_id = self.next_id
        self.next_id += 1
        self.ws.send_json({"id": command_id, "method": method, "params": params or {}})
        deadline = time.time() + timeout
        while time.time() < deadline:
            message = self.ws.recv_json()
            if message.get("id") == command_id:
                if "error" in message:
                    raise RuntimeError(f"{method}: {message['error']}")
                result = message.get("result", {})
                return result if isinstance(result, dict) else {}
        raise TimeoutError(method)

    def navigate(self, url: str) -> None:
        self.call("Page.navigate", {"url": url}, timeout=10)
        self.wait_for("document.readyState === 'complete'", seconds=12)
        time.sleep(0.7)

    def evaluate(self, expression: str) -> object:
        result = self.call(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True},
            timeout=20,
        )
        value = result.get("result", {})
        return value.get("value") if isinstance(value, dict) else None

    def wait_for(self, expression: str, *, seconds: int = 10) -> bool:
        deadline = time.time() + seconds
        while time.time() < deadline:
            if self.evaluate(expression):
                return True
            time.sleep(0.35)
        return False

    def click_text(self, pattern: str) -> bool:
        script = f"""
(() => {{
  const re = new RegExp({json.dumps(pattern)});
  const nodes = Array.from(document.querySelectorAll('button,a,[role="button"]'));
  const target = nodes.find((node) => {{
    const disabled = node instanceof HTMLButtonElement && node.disabled;
    return !disabled && re.test((node.textContent || '').trim());
  }});
  if (!target) return false;
  target.click();
  return true;
}})()
"""
        return bool(self.evaluate(script))

    def click_text_until(self, pattern: str, *, seconds: int = 10) -> bool:
        deadline = time.time() + seconds
        while time.time() < deadline:
            if self.click_text(pattern):
                return True
            time.sleep(0.35)
        return False

    def click_selector_at(self, selector: str, index: int) -> bool:
        script = f"""
(() => {{
  const target = Array.from(document.querySelectorAll({json.dumps(selector)}))[{index}];
  if (!target) return false;
  target.click();
  return true;
}})()
"""
        return bool(self.evaluate(script))

    def set_token(self, token: str) -> None:
        self.evaluate(
            f"window.localStorage.setItem({json.dumps(STORAGE_TOKEN_KEY)}, {json.dumps(token)})",
        )

    def screenshot(self, name: str, output_dir: Path, url: str) -> CaptureResult:
        path = output_dir / f"{name}.png"
        result = self.call(
            "Page.captureScreenshot",
            {"format": "png", "fromSurface": True, "captureBeyondViewport": True},
            timeout=30,
        )
        data = result.get("data")
        if not isinstance(data, str):
            raise RuntimeError(f"{name}: screenshot data missing")
        path.write_bytes(base64.b64decode(data))
        size = path.stat().st_size
        if size < 8_000:
            raise RuntimeError(f"{name}: screenshot too small ({size} bytes)")
        return CaptureResult(name=name, path=path, url=url, bytes=size)

    def close(self) -> None:
        self.ws.close()


def seed_visual_qa() -> None:
    with SessionLocal() as session:
        seed_open_design_vnext_stage_one_qa_data(session)
        seed_open_design_vnext_stage_two_guide_qa_data(session)
        seed_open_design_vnext_qa_data(session)
        seed_open_design_vnext_late_qa_data(session)


def login(api_base: str, email: str) -> str:
    response = HTTP.post(
        f"{api_base.rstrip('/')}/api/v1/auth/login",
        json={"email": email, "password": DEMO_PASSWORD},
        timeout=10,
    )
    response.raise_for_status()
    token = response.json()["access_token"]
    if not isinstance(token, str):
        raise RuntimeError(f"{email}: access token missing")
    return token


def check_url(label: str, url: str) -> None:
    response = HTTP.get(url, timeout=5)
    response.raise_for_status()
    print(f"service ok: {label} -> {url}")


def check_services(ref_base: str, prod_base: str, api_base: str, cdp_base: str) -> None:
    check_url("Open Design prototype", f"{ref_base.rstrip('/')}/index.html")
    check_url("Next.js production frontend", prod_base.rstrip("/") + "/")
    check_url("FastAPI backend", f"{api_base.rstrip('/')}/health")
    check_url("Chrome CDP", f"{cdp_base.rstrip('/')}/json/version")


def capture_reference_pages(page: Page, ref_base: str, output_dir: Path) -> list[CaptureResult]:
    results: list[CaptureResult] = []
    for name, path in REFERENCE_PAGES:
        url = f"{ref_base.rstrip('/')}{path}"
        page.navigate(url)
        page.wait_for("document.body && document.body.innerText.length > 20", seconds=8)
        results.append(page.screenshot(name, output_dir, url))
    return results


def clear_auth_storage(page: Page) -> None:
    page.evaluate(f"window.localStorage.removeItem({json.dumps(STORAGE_TOKEN_KEY)})")


def capture_public_pages(page: Page, prod_base: str, output_dir: Path) -> list[CaptureResult]:
    base = prod_base.rstrip("/")
    results: list[CaptureResult] = []

    page.navigate(f"{base}/login")
    clear_auth_storage(page)
    for name, path in PRODUCTION_PUBLIC_PAGES:
        url = f"{base}{path}"
        page.navigate(url)
        if not page.wait_for(
            f"document.body.innerText.includes({json.dumps(PRODUCTION_PUBLIC_WAIT_TEXT[name])})",
            seconds=12,
        ):
            raise RuntimeError(f"{name}: expected public page text did not appear")
        time.sleep(0.8)
        results.append(page.screenshot(name, output_dir, url))
    return results


def capture_student_pages(
    page: Page,
    *,
    prod_base: str,
    api_base: str,
    output_dir: Path,
) -> list[CaptureResult]:
    base = prod_base.rstrip("/")
    round_one_token = login(api_base, ROUND_ONE_STUDENT_EMAIL)
    stage_one_token = login(api_base, ROUND_TWO_STAGE_ONE_STUDENT_EMAIL)
    results: list[CaptureResult] = []

    page.navigate(f"{base}/login?role=student")
    page.set_token(round_one_token)
    open_student_home(page, base, round_one_token)
    results.append(page.screenshot("round1-prod-student-home", output_dir, f"{base}/"))

    open_student_experiment_detail(page)
    results.append(page.screenshot("round1-prod-experiment-detail", output_dir, f"{base}/"))

    open_student_project_overview(page)
    results.append(page.screenshot("round1-prod-student-project", output_dir, f"{base}/"))

    open_student_home(page, base, stage_one_token)
    open_student_experiment_detail(page)
    open_student_project_overview(page)
    if not page.click_selector_at(".stage-rail button", 0):
        raise RuntimeError("project overview: cannot open stage index 0")
    page.wait_for("document.body.innerText.includes('需求访谈')", seconds=12)
    time.sleep(0.8)
    results.append(page.screenshot("round2-prod-interview-guide", output_dir, f"{base}/"))
    if not page.click_text_until("开始模拟访谈", seconds=8):
        raise RuntimeError("stage one: cannot enter interview lab")
    page.wait_for("document.body.innerText.includes('AI 实时反馈')", seconds=12)
    time.sleep(0.8)
    results.append(page.screenshot("round2-prod-stage-one-interview", output_dir, f"{base}/"))
    if not page.click_text_until("完成并退出", seconds=8):
        raise RuntimeError("stage one: cannot enter interview submit page")
    if not page.wait_for("document.body.innerText.includes('把客户访谈整理成可进入阶段二的需求证据')", seconds=12):
        raise RuntimeError("stage one: interview submit text did not appear")
    time.sleep(0.8)
    results.append(page.screenshot("round2-prod-interview-submit", output_dir, f"{base}/"))

    stage_two_guide_token = login(api_base, OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_STUDENT_EMAIL)
    open_student_home(page, base, stage_two_guide_token)
    open_student_experiment_detail(page)
    open_student_project_overview(page)
    if not page.click_selector_at(".stage-rail button", 1):
        raise RuntimeError("project overview: cannot open stage index 1")
    if not page.wait_for("document.body.innerText.includes('阶段二不是一个文档')", seconds=12):
        raise RuntimeError("stage two guide: guide text did not appear")
    time.sleep(0.8)
    results.append(page.screenshot("round3-prod-solution-guide", output_dir, f"{base}/"))

    token = login(api_base, OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL)
    open_student_home(page, base, token)
    open_student_experiment_detail(page)
    open_student_project_overview(page)
    if not page.click_selector_at(".stage-rail button", 1):
        raise RuntimeError("project overview: cannot open stage index 1")
    if not enter_stage_two_workbench(page):
        raise RuntimeError("stage two: cannot enter solution workbench")
    page.wait_for("document.body.innerText.includes('从访谈证据，推导可交付的技术方案')", seconds=12)
    time.sleep(0.8)
    results.append(page.screenshot("round3-prod-stage-two-solution", output_dir, f"{base}/"))

    stage_captures = (
        ("round5-prod-stage-four-agent", 3, "智能体实现"),
        ("round6-prod-stage-five-delivery", 4, "交付验收"),
    )
    for name, stage_index, wait_text in stage_captures:
        if stage_index > 0:
            open_student_home(page, base, token)
            open_student_experiment_detail(page)
            open_student_project_overview(page)
        if not page.click_selector_at(".stage-rail button", stage_index):
            raise RuntimeError(f"project overview: cannot open stage index {stage_index}")
        page.wait_for(f"document.body.innerText.includes({json.dumps(wait_text)})", seconds=12)
        time.sleep(0.8)
        results.append(page.screenshot(name, output_dir, f"{base}/"))

    results.extend(capture_stage_three_rag_pages(page, base=base, token=token, output_dir=output_dir))

    return results


def capture_stage_three_rag_pages(
    page: Page,
    *,
    base: str,
    token: str,
    output_dir: Path,
) -> list[CaptureResult]:
    results: list[CaptureResult] = []
    steps = (
        ("round4-prod-rag-source", "数据源识别", "数据源识别：判断哪些资料可以进入 RAG 知识库。"),
        ("round4-prod-rag-data-quality", "数据质量评估", "数据质量评估"),
        ("round4-prod-rag-cleaning", "清洗与预处理", "清洗与预处理"),
        ("round4-prod-rag-structure", "知识结构设计", "知识结构设计"),
        ("round4-prod-rag-chunking", "分块策略", "分块策略"),
        ("round4-prod-rag-vector-storage", "向量化与存储", "向量化与存储"),
        ("round4-prod-rag-retrieval", "召回策略", "召回策略"),
        ("round4-prod-rag-answer-citation", "回答生成与引用", "回答生成与引用"),
        ("round4-prod-rag-recall-test", "召回测试", "召回测试"),
        ("round4-prod-rag-risk-boundary", "风险边界", "风险边界"),
    )

    open_student_home(page, base, token)
    open_student_experiment_detail(page)
    open_student_project_overview(page)
    if not page.click_selector_at(".stage-rail button", 2):
        raise RuntimeError("student project: cannot open stage three for RAG screenshots")
    page.wait_for("document.body.innerText.includes('知识工程')", seconds=12)
    time.sleep(0.8)

    for _ in range(4):
        if page.wait_for("document.querySelector('.rag-flow-nav') !== null", seconds=1):
            break
        page.click_text("返回数据源识别")
        time.sleep(0.5)

    if not page.wait_for("document.querySelector('.rag-flow-nav') !== null", seconds=6):
        raise RuntimeError("stage three: cannot reach RAG flow navigation")

    for name, nav_text, wait_text in steps:
        if not page.click_text(nav_text):
            raise RuntimeError(f"stage three: cannot open RAG step {nav_text}")
        page.wait_for(f"document.body.innerText.includes({json.dumps(wait_text)})", seconds=8)
        time.sleep(0.6)
        results.append(page.screenshot(name, output_dir, f"{base}/"))

    return results


def capture_late_stage_student_pages(
    page: Page,
    *,
    prod_base: str,
    api_base: str,
    output_dir: Path,
) -> list[CaptureResult]:
    base = prod_base.rstrip("/")
    token = login(api_base, OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL)
    results: list[CaptureResult] = []

    page.navigate(f"{base}/login?role=student")
    page.set_token(token)
    open_student_home(page, base, token)
    open_student_experiment_detail(page)
    open_student_project_overview(page)
    if not page.click_selector_at(".stage-rail button", 3):
        raise RuntimeError("late student project: cannot open stage four")
    page.wait_for("document.body.innerText.includes('智能体实现')", seconds=12)
    for name, step_index, wait_text in LATE_STAGE_FOUR_STEPS:
        if not page.click_selector_at(".agent-flow-nav button", step_index):
            raise RuntimeError(f"late student project: cannot open stage four step {step_index}")
        page.wait_for(f"document.body.innerText.includes({json.dumps(wait_text)})", seconds=12)
        time.sleep(0.8)
        results.append(page.screenshot(name, output_dir, f"{base}/"))

    open_student_home(page, base, token)
    open_student_experiment_detail(page)
    open_student_project_overview(page)
    if not page.click_selector_at(".stage-rail button", 4):
        raise RuntimeError("late student project: cannot open stage five")
    page.wait_for("document.body.innerText.includes('交付验收')", seconds=12)
    time.sleep(0.8)
    if not page.wait_for("document.body.innerText.includes('把项目结果写成交付说明文档')", seconds=2):
        if not page.click_text("返回文档工作台|交付文档"):
            raise RuntimeError("late student project: cannot open stage five delivery document")
        if not page.wait_for("document.body.innerText.includes('把项目结果写成交付说明文档')", seconds=12):
            raise RuntimeError("late student project: delivery document text did not appear")
        time.sleep(0.8)
    results.append(page.screenshot("round6-prod-delivery-document-late", output_dir, f"{base}/"))
    if not page.click_selector_at(".solution-workbench-nav button", 2) and not page.click_text("验收确认"):
        raise RuntimeError("late student project: cannot open stage five acceptance")
    if not page.wait_for("document.body.innerText.includes('完成客户验收确认')", seconds=12):
        raise RuntimeError("late student project: acceptance text did not appear")
    time.sleep(0.8)
    results.append(page.screenshot("round6-prod-delivery-acceptance-late", output_dir, f"{base}/"))

    open_student_home(page, base, token)
    open_student_experiment_detail(page)
    open_student_project_overview(page)
    if not page.click_text("档案袋|项目档案袋"):
        raise RuntimeError("late student project: cannot open portfolio")
    page.wait_for("document.body.innerText.includes('项目档案袋')", seconds=12)
    time.sleep(0.8)
    results.append(page.screenshot("round7-prod-portfolio-report", output_dir, f"{base}/"))
    return results


def open_student_home(page: Page, base: str, token: str) -> None:
    page.set_token(token)
    page.navigate(f"{base}/?qaCapture={int(time.time() * 1000)}")
    page.set_token(token)
    if not page.wait_for("document.body.innerText.includes('制造业质检')", seconds=12):
        raise RuntimeError("student home: visual QA course text did not appear")


def open_student_experiment_detail(page: Page) -> None:
    if not page.click_text_until("继续实验|进入实验", seconds=12):
        raise RuntimeError("student home: cannot enter visual QA course")
    if not page.wait_for("document.body.innerText.includes('质检追溯与审厂材料准备')", seconds=12):
        raise RuntimeError("student detail: experiment detail text did not appear")


def open_student_project_overview(page: Page) -> None:
    if not page.click_text_until("开始需求访谈", seconds=12):
        raise RuntimeError("experiment detail: cannot open project overview")
    if not page.wait_for("document.body.innerText.includes('学生项目工作台')", seconds=12):
        raise RuntimeError("student project: project overview text did not appear")


def enter_stage_two_workbench(page: Page) -> bool:
    if page.evaluate("document.body.innerText.includes('从访谈证据，推导可交付的技术方案')"):
        return True
    page.evaluate(
        """
(() => {
  document
    .querySelectorAll('.solution-checks input[type="checkbox"]')
    .forEach((input) => {
      if (!input.checked && !input.disabled) input.click();
    });
})()
""",
    )
    if not page.wait_for(
        """
Array.from(document.querySelectorAll('button')).some((node) =>
  /进入阶段二工作台/.test((node.textContent || '').trim()) && !node.disabled
)
""",
        seconds=5,
    ):
        return False
    return page.click_text("进入阶段二工作台")


def capture_teacher_pages(
    page: Page,
    *,
    prod_base: str,
    api_base: str,
    output_dir: Path,
) -> list[CaptureResult]:
    base = prod_base.rstrip("/")
    token = login(api_base, TEACHER_EMAIL)
    page.navigate(f"{base}/login?role=teacher")
    page.set_token(token)
    page.navigate(f"{base}/")
    page.wait_for("document.body.innerText.includes('教师工作台')", seconds=12)
    results = [page.screenshot("round8-prod-teacher-dashboard", output_dir, f"{base}/")]
    if not page.click_text("AI 评审"):
        raise RuntimeError("teacher dashboard: cannot open AI review")
    page.wait_for("document.body.innerText.includes('AI Rubric')", seconds=12)
    results.append(page.screenshot("round8-prod-ai-review-rubric", output_dir, f"{base}/"))
    return results


def capture_admin_pages(
    page: Page,
    *,
    prod_base: str,
    api_base: str,
    output_dir: Path,
) -> list[CaptureResult]:
    base = prod_base.rstrip("/")
    token = login(api_base, ADMIN_EMAIL)
    page.navigate(f"{base}/login?role=admin")
    page.set_token(token)
    page.navigate(f"{base}/")
    page.wait_for("document.body.innerText.includes('部署管理')", seconds=12)
    return [page.screenshot("round8-prod-admin-deployment", output_dir, f"{base}/")]


def write_manifest(output_dir: Path, results: list[CaptureResult], args: argparse.Namespace) -> None:
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "captured_at": datetime.now(UTC).isoformat(),
                "visual_stage_one_qa_student": OPEN_DESIGN_VNEXT_STAGE_ONE_QA_STUDENT_EMAIL,
                "visual_stage_two_guide_qa_student": OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_STUDENT_EMAIL,
                "visual_qa_student": OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL,
                "visual_late_qa_student": OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL,
                "api_base": args.api_base,
                "prod_base": args.prod_base,
                "ref_base": args.ref_base,
                "cdp_base": args.cdp_base,
                "captures": [
                    {
                        "name": item.name,
                        "path": str(item.path),
                        "url": item.url,
                        "bytes": item.bytes,
                    }
                    for item in results
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"manifest: {manifest_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Capture Open Design vNext reference and production QA screenshots.",
    )
    parser.add_argument("--api-base", default=DEFAULT_API_BASE)
    parser.add_argument("--cdp-base", default=DEFAULT_CDP_BASE)
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--prod-base", default=DEFAULT_PROD_BASE)
    parser.add_argument("--ref-base", default=DEFAULT_REF_BASE)
    parser.add_argument("--skip-seed", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    check_services(args.ref_base, args.prod_base, args.api_base, args.cdp_base)
    if not args.skip_seed:
        seed_visual_qa()
        print(
            "visual QA seeds reset for "
            f"{OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL} and {OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL}"
        )

    results: list[CaptureResult] = []

    page = Page(args.cdp_base)
    try:
        results.extend(capture_reference_pages(page, args.ref_base, output_dir))
    finally:
        page.close()

    page = Page(args.cdp_base)
    try:
        results.extend(capture_public_pages(page, args.prod_base, output_dir))
    finally:
        page.close()

    page = Page(args.cdp_base)
    try:
        results.extend(
            capture_student_pages(
                page,
                prod_base=args.prod_base,
                api_base=args.api_base,
                output_dir=output_dir,
            ),
        )
    finally:
        page.close()

    page = Page(args.cdp_base)
    try:
        results.extend(
            capture_late_stage_student_pages(
                page,
                prod_base=args.prod_base,
                api_base=args.api_base,
                output_dir=output_dir,
            ),
        )
    finally:
        page.close()

    page = Page(args.cdp_base)
    try:
        results.extend(
            capture_teacher_pages(
                page,
                prod_base=args.prod_base,
                api_base=args.api_base,
                output_dir=output_dir,
            ),
        )
    finally:
        page.close()

    page = Page(args.cdp_base)
    try:
        results.extend(
            capture_admin_pages(
                page,
                prod_base=args.prod_base,
                api_base=args.api_base,
                output_dir=output_dir,
            ),
        )
    finally:
        page.close()

    write_manifest(output_dir, results, args)
    print(f"captured {len(results)} screenshots in {output_dir}")


if __name__ == "__main__":
    main()
