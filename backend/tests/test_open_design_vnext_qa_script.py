from backend.scripts import capture_open_design_vnext_qa as qa


def test_round_zero_production_captures_cover_entry_and_login_pages() -> None:
    production_pages = dict(qa.PRODUCTION_PUBLIC_PAGES)

    assert production_pages["round0-prod-login-entry"] == "/#login-entry"
    assert production_pages["round0-prod-login"] == "/login"


def test_round_two_reference_covers_guide_and_lab_pages() -> None:
    reference_pages = dict(qa.REFERENCE_PAGES)

    assert reference_pages["round2-ref-interview-guide"] == "/screens/06-interview-guide.html"
    assert reference_pages["round2-ref-interview-lab"] == "/screens/06-interview-lab.html"


def test_round_three_reference_covers_solution_guide_and_workbench_pages() -> None:
    reference_pages = dict(qa.REFERENCE_PAGES)

    assert reference_pages["round3-ref-solution-guide"] == "/screens/07-solution-guide.html"
    assert reference_pages["round3-ref-solution-definition"] == "/screens/07-solution-definition.html"


def test_round_one_and_stage_one_captures_use_separate_visual_accounts() -> None:
    assert qa.ROUND_ONE_STUDENT_EMAIL == "lin@edufde.demo"
    assert qa.ROUND_TWO_STAGE_ONE_STUDENT_EMAIL == "wang@edufde.demo"
    assert qa.ROUND_ONE_STUDENT_EMAIL != qa.ROUND_TWO_STAGE_ONE_STUDENT_EMAIL


def test_late_stage_four_capture_waits_for_current_test_score_heading() -> None:
    late_stage_four_steps = {name: wait_text for name, _, wait_text in qa.LATE_STAGE_FOUR_STEPS}

    assert (
        late_stage_four_steps["round5-prod-agent-test-score-late"]
        == "用平台测试集验证 Dify 智能体是否达到交付门槛"
    )
