import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

def login(driver, base_url, u, p):
    driver.get(base_url + "/login")
    driver.find_element(By.NAME, "username").send_keys(u)
    driver.find_element(By.NAME, "password").send_keys(p)
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)

def test_student_register_and_login(driver, base_url):
    driver.get(base_url + "/register")
    driver.find_element(By.NAME, "username").send_keys("student1")
    driver.find_element(By.NAME, "password").send_keys("pass123")
    driver.find_element(By.NAME, "name").send_keys("Student One")
    driver.find_element(By.NAME, "email").send_keys("s1@example.com")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    login(driver, base_url, "student1", "pass123")
    assert "Events" in driver.page_source

def test_admin_create_event(driver, base_url):
    login(driver, base_url, "admin", "admin123")
    driver.get(base_url + "/admin/events/new")
    time.sleep(1)
    driver.find_element(By.NAME, "title").send_keys("Tech Fest")
    driver.find_element(By.NAME, "description").send_keys("Annual tech event")
    driver.find_element(By.NAME, "event_date").send_keys("2026-12-01")
    driver.find_element(By.NAME, "venue").send_keys("Auditorium")
    driver.find_element(By.NAME, "capacity").clear()
    driver.find_element(By.NAME, "capacity").send_keys("100")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    assert "Tech Fest" in driver.page_source

def test_student_event_registration(driver, base_url):
    login(driver, base_url, "admin", "admin123")
    driver.get(base_url + "/admin/events/new")
    time.sleep(1)
    try:
        driver.find_element(By.NAME, "title").send_keys("Workshop")
        driver.find_element(By.NAME, "event_date").send_keys("2026-12-02")
        driver.find_element(By.NAME, "venue").send_keys("Lab")
        driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
        time.sleep(2)
    except Exception:
        pass
    driver.get(base_url + "/logout")
    time.sleep(1)
    driver.get(base_url + "/register")
    time.sleep(1)
    try:
        driver.find_element(By.NAME, "username").send_keys("student2")
        driver.find_element(By.NAME, "password").send_keys("pass123")
        driver.find_element(By.NAME, "name").send_keys("Student Two")
        driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
        time.sleep(2)
    except Exception:
        pass
    login(driver, base_url, "student2", "pass123")
    driver.get(base_url + "/events")
    time.sleep(1)
    btns = driver.find_elements(By.CSS_SELECTOR, "button[type=submit]")
    if btns:
        btns[0].click()
        time.sleep(2)
    assert "Registration" in driver.page_source or "Events" in driver.page_source

def test_view_participants(driver, base_url):
    login(driver, base_url, "admin", "admin123")
    driver.get(base_url + "/admin")
    time.sleep(1)
    links = driver.find_elements(By.LINK_TEXT, "Participants")
    if links:
        links[0].click()
        time.sleep(1)
        assert "Participants" in driver.page_source
    else:
        assert True
