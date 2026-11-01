/*jslint browser, long */
(function () {
    "use strict";

    // Вставьте сюда свой адрес формы: https://formcarry.com/s/<ID>
    const ENDPOINT = "https://formcarry.com/s/YOUR_FORM_ID";
    const STORAGE_KEY = "feedbackFormData";
    const POPUP_HASH = "#feedback";
    const FIELD_NAMES = ["fio", "email", "phone", "organization", "message", "agree"];
    // Символы, которые нельзя вводить: цифры в ФИО и буквы в телефоне
    const FIO_FORBIDDEN = /[^A-Za-zА-Яа-яЁё\s.'\-]/g;
    const PHONE_FORBIDDEN = /[^0-9+\s\-\(\)]/g;

    const overlay = document.getElementById("popup");
    const form = document.getElementById("feedback-form");
    const openButtons = document.querySelectorAll(".js-open-form");
    const closeButton = document.getElementById("close-form");
    const submitButton = document.getElementById("submit-button");
    const statusBox = document.getElementById("form-status");

    function showStatus(text, isError) {
        statusBox.textContent = text;
        statusBox.hidden = text === "";
        statusBox.classList.toggle("is-error", isError);
        statusBox.classList.toggle("is-success", !isError && text !== "");
    }

    function sanitize(input, forbidden) {
        const cleaned = input.value.replace(forbidden, "");
        if (cleaned !== input.value) {
            input.value = cleaned;
        }
    }

    function sanitizeAll() {
        sanitize(form.elements.fio, FIO_FORBIDDEN);
        sanitize(form.elements.phone, PHONE_FORBIDDEN);
    }

    function saveData() {
        const data = {};
        FIELD_NAMES.forEach(function (name) {
            const field = form.elements[name];
            data[name] = (
                field.type === "checkbox"
                ? field.checked
                : field.value
            );
        });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (ignore) {
            return;
        }
    }

    function restoreData() {
        let data = {};
        try {
            data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (ignore) {
            data = {};
        }
        FIELD_NAMES.forEach(function (name) {
            const field = form.elements[name];
            if (data[name] !== undefined) {
                if (field.type === "checkbox") {
                    field.checked = Boolean(data[name]);
                } else {
                    field.value = data[name];
                }
            }
        });
    }

    function clearData() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (ignore) {
            return;
        }
        form.reset();
    }

    function openPopup(push) {
        overlay.classList.add("is-open");
        document.body.classList.add("no-scroll");
        if (push) {
            history.pushState({popup: true}, "", POPUP_HASH);
        }
        form.elements.fio.focus();
    }

    function closePopup() {
        overlay.classList.remove("is-open");
        document.body.classList.remove("no-scroll");
        showStatus("", false);
    }

    function requestClose() {
        if (history.state && history.state.popup) {
            history.back();
        } else {
            closePopup();
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        if (!form.reportValidity()) {
            return;
        }
        const payload = {};
        FIELD_NAMES.forEach(function (name) {
            const field = form.elements[name];
            if (field.type === "checkbox") {
                payload[name] = (
                    field.checked
                    ? "Да"
                    : "Нет"
                );
            } else {
                payload[name] = field.value;
            }
        });

        submitButton.disabled = true;
        showStatus("Отправка…", false);

        fetch(ENDPOINT, {
            body: JSON.stringify(payload),
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            method: "POST"
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        }).then(function () {
            clearData();
            showStatus("Спасибо! Ваше сообщение отправлено.", false);
        }).catch(function () {
            showStatus("Не удалось отправить форму. Попробуйте ещё раз позже.", true);
        }).finally(function () {
            submitButton.disabled = false;
        });
    }

    function handleInput(event) {
        if (event.target === form.elements.fio) {
            sanitize(form.elements.fio, FIO_FORBIDDEN);
        } else if (event.target === form.elements.phone) {
            sanitize(form.elements.phone, PHONE_FORBIDDEN);
        }
        saveData();
    }

    restoreData();
    sanitizeAll();

    openButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            openPopup(true);
        });
    });
    closeButton.addEventListener("click", requestClose);
    overlay.addEventListener("click", function (event) {
        if (event.target === overlay) {
            requestClose();
        }
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && overlay.classList.contains("is-open")) {
            requestClose();
        }
    });
    form.addEventListener("input", handleInput);
    form.addEventListener("change", saveData);
    form.addEventListener("submit", handleSubmit);

    window.addEventListener("popstate", function () {
        if (window.location.hash === POPUP_HASH) {
            openPopup(false);
        } else {
            closePopup();
        }
    });

    // Если страницу открыли сразу по адресу с #feedback
    if (window.location.hash === POPUP_HASH) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
        openPopup(true);
    }
}());
