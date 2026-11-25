/*jslint browser */

(function () {
    "use strict";

    // Замените YOUR_FORM_ID на идентификатор формы из личного кабинета formcarry.com
    const ENDPOINT = "https://formcarry.com/s/EAIyrmhZri2";
    const STORAGE_KEY = "feedback-form-draft";
    const POPUP_HASH = "#feedback";
    const TEXT_FIELDS = ["fullName", "email", "phone", "organization", "message"];

    const MESSAGES = {
        hint: "",
        pending: "Отправляем…",
        success: "Готово! Сообщение отправлено.",
        error: "Не отправлено. Проверьте соединение и повторите."
    };

    const popup = document.getElementById("popup");
    const form = document.getElementById("feedback-form");
    const statusLine = document.getElementById("form-status");
    const submitButton = document.getElementById("submit-button");
    const openButton = document.getElementById("open-button");
    const closeButton = document.getElementById("close-button");

    function setStatus(kind) {
        statusLine.dataset.kind = kind;
        statusLine.textContent = MESSAGES[kind];
    }

    // LocalStorage

    function saveDraft() {
        const draft = {};
        TEXT_FIELDS.forEach(function (name) {
            draft[name] = form.elements[name].value;
        });
        draft.consent = form.elements.consent.checked;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        } catch (ignore) {
            // Хранилище недоступно: форма продолжает работать без сохранения
        }
    }

    function restoreDraft() {
        let draft = null;
        try {
            draft = JSON.parse(localStorage.getItem(STORAGE_KEY));
        } catch (ignore) {
            draft = null;
        }
        if (!draft) {
            return;
        }
        TEXT_FIELDS.forEach(function (name) {
            if (typeof draft[name] === "string") {
                form.elements[name].value = draft[name];
            }
        });
        form.elements.consent.checked = draft.consent === true;
    }

    function clearDraft() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (ignore) {
            // Нечего очищать
        }
    }

    // Попап и History API

    function showPopup() {
        if (!popup.open) {
            setStatus("hint");
            popup.showModal();
        }
    }

    function hidePopup() {
        if (popup.open) {
            popup.close();
        }
    }

    function openPopup() {
        history.pushState({popup: true}, "", POPUP_HASH);
        showPopup();
    }

    function requestClose() {
        if (location.hash === POPUP_HASH) {
            history.back();
        } else {
            hidePopup();
        }
    }

    window.addEventListener("popstate", function () {
        if (location.hash === POPUP_HASH) {
            showPopup();
        } else {
            hidePopup();
        }
    });

    openButton.addEventListener("click", openPopup);
    closeButton.addEventListener("click", requestClose);

    popup.addEventListener("cancel", function (event) {
        event.preventDefault();
        requestClose();
    });

    popup.addEventListener("click", function (event) {
        if (event.target === popup) {
            requestClose();
        }
    });

    // Отправка

    function collectData() {
        const data = {};
        TEXT_FIELDS.forEach(function (name) {
            data[name] = form.elements[name].value.trim();
        });
        return data;
    }

    function sendForm(data) {
        return fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }).then(function (response) {
            return response.json().catch(function () {
                return {};
            }).then(function (body) {
                if (!response.ok || body.status === "error") {
                    throw new Error("Server error " + response.status);
                }
            });
        });
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitButton.disabled = true;
        setStatus("pending");

        sendForm(collectData()).then(function () {
            form.reset();
            clearDraft();
            setStatus("success");
        }).catch(function () {
            setStatus("error");
        }).then(function () {
            submitButton.disabled = false;
        });
    });

    // Поле ФИО: убираем всё, кроме букв, пробелов и дефиса
    const fullNameInput = form.elements.fullName;

    fullNameInput.addEventListener("input", function () {
        fullNameInput.value = fullNameInput.value.replace(/[^\p{L}\s-]/gu, "");
    });

    form.addEventListener("input", function () {
        saveDraft();
        if (statusLine.dataset.kind !== "hint") {
            setStatus("hint");
        }
    });

    // Запуск

    restoreDraft();

    if (location.hash === POPUP_HASH) {
        // Страницу открыли по ссылке с формой: сохраняем «Назад» рабочим
        history.replaceState(null, "", location.pathname + location.search);
        openPopup();
    }
}());
