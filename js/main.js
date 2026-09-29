let menu = document.querySelector("#menu-btn")
let navbar = document.querySelector(".navbar")


menu.onclick = () =>{
    menu.classList.toggle("fa-times")
    navbar.classList.toggle("active")
}


window.onscroll = () =>{
    menu.classList.remove("fa-times")
    navbar.classList.remove("active")
}


/* shared form handling (contact, log in, sign up)  */

const validateEmail = value => {
    if (!value) return "Please enter your email address."
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Please enter a valid email address."
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// wires up validation, error messages, submit button and status line of a form.
// send() does the actual work: it resolves with the success message or throws.
// trap() may short-circuit the submit with a fake success message (honeypot).
const setupForm = ({ form, fields, busyText, send, trap }) => {
    let submitBtn = form.querySelector("button[type=submit]")
    let formStatus = form.querySelector(".form-status")
    let submitted = false

    const getInput = id => form.querySelector("#" + id)

    const showError = (field, message) => {
        let input = getInput(field.id)
        let error = form.querySelector("#" + field.id + "-error")

        error.textContent = message
        input.classList.toggle("invalid", !!message)
        input.setAttribute("aria-invalid", message ? "true" : "false")
    }

    const validateField = field => {
        let input = getInput(field.id)
        let value = input.type === "checkbox" ? input.checked
            // passwords are taken exactly as typed, spaces included
            : field.raw ? input.value : input.value.trim()
        let message = field.validate(value)

        showError(field, message)
        return !message
    }

    const resetForm = () => {
        form.reset()
        fields.forEach(field => showError(field, ""))
        // back to square one, so the empty form does not complain while retyping
        submitted = false
    }

    const setStatus = (message, type) => {
        formStatus.textContent = message
        formStatus.className = "form-status" + (type ? " " + type : "")
    }

    fields.forEach(field => {
        let input = getInput(field.id)
        let linked = fields.find(other => other.id === field.linked)

        // only nag after a first submit attempt or once the field has been left
        input.addEventListener("blur", () => validateField(field))
        input.addEventListener("input", () => {
            if (submitted || input.classList.contains("invalid")) validateField(field)

            // e.g. changing the password has to re-check the repeated one
            if (linked && (submitted || getInput(linked.id).classList.contains("invalid"))) validateField(linked)
        })
    })

    form.addEventListener("submit", async e => {
        e.preventDefault()
        submitted = true
        setStatus("", "")

        let trapped = trap && trap()

        if (trapped) {
            resetForm()
            setStatus(trapped, "success")
            return
        }

        let invalid = fields.filter(field => !validateField(field))

        if (invalid.length) {
            getInput(invalid[0].id).focus()
            return
        }

        let originalText = submitBtn.textContent
        submitBtn.disabled = true
        submitBtn.textContent = busyText

        try {
            let message = await send()
            resetForm()
            setStatus(message, "success")
        } catch (err) {
            setStatus("Something went wrong. Please try again later.", "error")
        } finally {
            submitBtn.disabled = false
            submitBtn.textContent = originalText
        }
    })

    return {
        reset: () => {
            resetForm()
            setStatus("", "")
        }
    }
}


/* contact form  */

// leave empty to stay in demo mode (validation + success message, nothing is sent).
// drop in a form service endpoint (formspree, web3forms, ...) to send for real.
const CONTACT_ENDPOINT = ""

let contactForm = document.querySelector("#contact-form")

if (contactForm) {
    let honeypot = contactForm.querySelector("#cf-website")

    setupForm({
        form: contactForm,
        busyText: "sending...",
        fields: [
            {
                id: "cf-name",
                validate: value => value ? "" : "Please enter your name."
            },
            {
                id: "cf-email",
                validate: validateEmail
            },
            {
                id: "cf-message",
                validate: value => {
                    if (!value) return "Please enter a message."
                    return value.length < 10 ? "Your message must be at least 10 characters long." : ""
                }
            }
        ],
        // bots fill the hidden field: pretend everything went fine, drop the message
        trap: () => honeypot.value ? "Thanks! Your message has been received." : "",
        send: async () => {
            if (!CONTACT_ENDPOINT) {
                await wait(600)
                return "Thanks! Your message has been received (demo mode - no message was actually sent)."
            }

            let response = await fetch(CONTACT_ENDPOINT, {
                method: "POST",
                headers: { Accept: "application/json" },
                body: new FormData(contactForm)
            })

            if (!response.ok) throw new Error("request failed: " + response.status)
            return "Thanks! Your message has been sent. We'll get back to you soon."
        }
    })
}


/* password show / hide  */

const setPasswordVisible = (btn, visible) => {
    let input = document.querySelector("#" + btn.getAttribute("aria-controls"))

    input.type = visible ? "text" : "password"
    btn.classList.toggle("fa-eye", !visible)
    btn.classList.toggle("fa-eye-slash", visible)
    btn.setAttribute("aria-pressed", visible ? "true" : "false")
    btn.setAttribute("aria-label", visible ? "hide password" : "show password")
}

let passwordToggles = document.querySelectorAll(".toggle-password")

passwordToggles.forEach(btn => {
    btn.addEventListener("click", () => setPasswordVisible(btn, btn.getAttribute("aria-pressed") !== "true"))
})


/* login / sign up modal (mock - nothing is sent or stored)  */

let authModal = document.querySelector("#auth-modal")

if (authModal) {
    let loginBtn = document.querySelector("#login-btn")
    let closeBtn = authModal.querySelector("#auth-close")
    let tabs = [...authModal.querySelectorAll(".auth-tab")]
    let lastFocus = null

    let loginForm = setupForm({
        form: authModal.querySelector("#login-form"),
        busyText: "logging in...",
        fields: [
            {
                id: "lf-email",
                validate: validateEmail
            },
            {
                id: "lf-password",
                raw: true,
                validate: value => value ? "" : "Please enter your password."
            }
        ],
        send: async () => {
            await wait(600)
            return "Welcome back! You are now logged in (demo mode - nothing was actually sent)."
        }
    })

    let registerForm = setupForm({
        form: authModal.querySelector("#register-form"),
        busyText: "creating account...",
        fields: [
            {
                id: "rf-name",
                validate: value => value ? "" : "Please enter your name."
            },
            {
                id: "rf-email",
                validate: validateEmail
            },
            {
                id: "rf-password",
                raw: true,
                linked: "rf-password-confirm",
                validate: value => {
                    if (!value) return "Please choose a password."
                    return value.length < 8 ? "Your password must be at least 8 characters long." : ""
                }
            },
            {
                id: "rf-password-confirm",
                raw: true,
                validate: value => {
                    if (!value) return "Please repeat your password."
                    return value !== authModal.querySelector("#rf-password").value ? "The passwords do not match." : ""
                }
            },
            {
                id: "rf-terms",
                validate: checked => checked ? "" : "Please accept the terms of use."
            }
        ],
        send: async () => {
            await wait(600)
            return "Your account has been created (demo mode - nothing was actually sent or stored)."
        }
    })

    const showTab = (name, focusField) => {
        tabs.forEach(tab => {
            let active = tab.id === "tab-" + name

            tab.classList.toggle("active", active)
            tab.setAttribute("aria-selected", active ? "true" : "false")
            tab.tabIndex = active ? 0 : -1
            authModal.querySelector("#" + tab.getAttribute("aria-controls")).hidden = !active
        })

        if (focusField) authModal.querySelector("#panel-" + name + " input").focus()
    }

    const openModal = () => {
        lastFocus = document.activeElement
        menu.classList.remove("fa-times")
        navbar.classList.remove("active")

        authModal.hidden = false
        document.documentElement.classList.add("modal-open")
        showTab("login", true)
    }

    const closeModal = () => {
        authModal.hidden = true
        document.documentElement.classList.remove("modal-open")

        // next time the dialog opens clean: no leftover input, errors or visible passwords
        loginForm.reset()
        registerForm.reset()
        passwordToggles.forEach(btn => setPasswordVisible(btn, false))

        if (lastFocus) lastFocus.focus()
    }

    loginBtn.addEventListener("click", e => {
        e.preventDefault()
        openModal()
    })

    closeBtn.addEventListener("click", closeModal)

    // a click on the dark backdrop (not inside the box) closes the dialog
    authModal.addEventListener("click", e => {
        if (e.target === authModal) closeModal()
    })

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => showTab(tab.id.replace("tab-", "")))

        // arrow keys move between the tabs, as expected from a tablist
        tab.addEventListener("keydown", e => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return

            let next = tabs[(index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length]
            showTab(next.id.replace("tab-", ""))
            next.focus()
        })
    })

    authModal.querySelectorAll(".auth-switch a").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault()
            showTab(link.dataset.tab, true)
        })
    })

    authModal.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            closeModal()
            return
        }

        if (e.key !== "Tab") return

        // keep keyboard focus inside the dialog while it is open
        let focusable = [...authModal.querySelectorAll("button, input, a[href]")]
            .filter(el => !el.disabled && el.tabIndex >= 0 && !el.closest("[hidden]"))
        let first = focusable[0]
        let last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
        }
    })
}
