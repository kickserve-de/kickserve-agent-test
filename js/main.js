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


/* contact form  */

// leave empty to stay in demo mode (validation + success message, nothing is sent).
// drop in a form service endpoint (formspree, web3forms, ...) to send for real.
const CONTACT_ENDPOINT = ""

let contactForm = document.querySelector("#contact-form")

if (contactForm) {
    let submitBtn = contactForm.querySelector("#contact-submit")
    let formStatus = contactForm.querySelector("#form-status")
    let honeypot = contactForm.querySelector("#cf-website")
    let submitted = false

    let fields = [
        {
            id: "cf-name",
            validate: value => value ? "" : "Please enter your name."
        },
        {
            id: "cf-email",
            validate: value => {
                if (!value) return "Please enter your email address."
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Please enter a valid email address."
            }
        },
        {
            id: "cf-message",
            validate: value => {
                if (!value) return "Please enter a message."
                return value.length < 10 ? "Your message must be at least 10 characters long." : ""
            }
        }
    ]

    const showError = (field, message) => {
        let input = document.querySelector("#" + field.id)
        let error = document.querySelector("#" + field.id + "-error")

        error.textContent = message
        input.classList.toggle("invalid", !!message)
        input.setAttribute("aria-invalid", message ? "true" : "false")
    }

    const validateField = field => {
        let input = document.querySelector("#" + field.id)
        let message = field.validate(input.value.trim())

        showError(field, message)
        return !message
    }

    const resetForm = () => {
        contactForm.reset()
        fields.forEach(field => showError(field, ""))
        // back to square one, so the empty form does not complain while retyping
        submitted = false
    }

    const setStatus = (message, type) => {
        formStatus.textContent = message
        formStatus.className = "form-status" + (type ? " " + type : "")
    }

    fields.forEach(field => {
        let input = document.querySelector("#" + field.id)

        // only nag after a first submit attempt or once the field has been left
        input.addEventListener("blur", () => validateField(field))
        input.addEventListener("input", () => {
            if (submitted || input.classList.contains("invalid")) validateField(field)
        })
    })

    contactForm.addEventListener("submit", async e => {
        e.preventDefault()
        submitted = true
        setStatus("", "")

        // bots fill the hidden field: pretend everything went fine, drop the message
        if (honeypot.value) {
            resetForm()
            setStatus("Thanks! Your message has been received.", "success")
            return
        }

        let invalid = fields.filter(field => !validateField(field))

        if (invalid.length) {
            document.querySelector("#" + invalid[0].id).focus()
            return
        }

        let originalText = submitBtn.textContent
        submitBtn.disabled = true
        submitBtn.textContent = "sending..."

        try {
            if (!CONTACT_ENDPOINT) {
                await new Promise(resolve => setTimeout(resolve, 600))
                resetForm()
                setStatus("Thanks! Your message has been received (demo mode - no message was actually sent).", "success")
            } else {
                let response = await fetch(CONTACT_ENDPOINT, {
                    method: "POST",
                    headers: { Accept: "application/json" },
                    body: new FormData(contactForm)
                })

                if (response.ok) {
                    resetForm()
                    setStatus("Thanks! Your message has been sent. We'll get back to you soon.", "success")
                } else {
                    setStatus("Something went wrong. Please try again later.", "error")
                }
            }
        } catch (err) {
            setStatus("Something went wrong. Please try again later.", "error")
        } finally {
            submitBtn.disabled = false
            submitBtn.textContent = originalText
        }
    })
}