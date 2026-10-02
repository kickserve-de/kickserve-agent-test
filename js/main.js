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


/* pong game  */

let pongCanvas = document.querySelector("#pong-canvas")

if (pongCanvas) {
    const ctx = pongCanvas.getContext("2d")
    const overlay = document.querySelector("#pong-overlay")
    const message = document.querySelector("#pong-message")
    const startBtn = document.querySelector("#pong-start")
    const playerScoreEl = document.querySelector("#pong-player")
    const computerScoreEl = document.querySelector("#pong-computer")

    const W = pongCanvas.width
    const H = pongCanvas.height
    const PADDLE_W = 12
    const PADDLE_H = 90
    const BALL = 12
    const WIN_SCORE = 5
    const PLAYER_SPEED = 480   // px per second with the arrow keys
    const COMPUTER_SPEED = 300 // slower than the ball, so the computer can be beaten

    const css = getComputedStyle(document.documentElement)
    const blue = css.getPropertyValue("--Soft-Blue").trim()
    const red = css.getPropertyValue("--Soft-Red").trim()

    let player, computer, ball, scores, keys = {}, running = false, lastTime = 0

    const resetBall = direction => {
        let angle = (Math.random() * 0.8 - 0.4) * Math.PI / 2
        ball = {
            x: W / 2 - BALL / 2,
            y: H / 2 - BALL / 2,
            speed: 360,
            vx: Math.cos(angle) * direction,
            vy: Math.sin(angle)
        }
    }

    const resetGame = () => {
        player = { y: H / 2 - PADDLE_H / 2 }
        computer = { y: H / 2 - PADDLE_H / 2 }
        scores = { player: 0, computer: 0 }
        playerScoreEl.textContent = 0
        computerScoreEl.textContent = 0
        resetBall(Math.random() < 0.5 ? 1 : -1)
    }

    const clampPaddle = paddle => {
        paddle.y = Math.max(0, Math.min(H - PADDLE_H, paddle.y))
    }

    // bounces the ball off a paddle; the hit position decides the new angle
    const hitPaddle = (paddle, paddleX, direction) => {
        let offset = (ball.y + BALL / 2 - (paddle.y + PADDLE_H / 2)) / (PADDLE_H / 2)
        let angle = offset * Math.PI / 4
        ball.vx = Math.cos(angle) * direction
        ball.vy = Math.sin(angle)
        ball.speed = Math.min(ball.speed + 30, 800)
        ball.x = direction > 0 ? paddleX + PADDLE_W : paddleX - BALL
    }

    const score = who => {
        scores[who]++
        playerScoreEl.textContent = scores.player
        computerScoreEl.textContent = scores.computer

        if (scores[who] >= WIN_SCORE) {
            running = false
            message.textContent = who === "player" ? "you win!" : "the computer wins"
            startBtn.textContent = "play again"
            overlay.hidden = false
            startBtn.focus()
            return
        }

        // the ball is served towards whoever just lost the point
        resetBall(who === "player" ? 1 : -1)
    }

    const update = dt => {
        if (keys.ArrowUp) player.y -= PLAYER_SPEED * dt
        if (keys.ArrowDown) player.y += PLAYER_SPEED * dt
        clampPaddle(player)

        let target = ball.y + BALL / 2 - PADDLE_H / 2
        let step = COMPUTER_SPEED * dt
        computer.y += Math.max(-step, Math.min(step, target - computer.y))
        clampPaddle(computer)

        ball.x += ball.vx * ball.speed * dt
        ball.y += ball.vy * ball.speed * dt

        if (ball.y <= 0 || ball.y + BALL >= H) {
            ball.vy = -ball.vy
            ball.y = Math.max(0, Math.min(H - BALL, ball.y))
        }

        let playerX = 20
        let computerX = W - 20 - PADDLE_W

        if (ball.vx < 0 && ball.x <= playerX + PADDLE_W && ball.x + BALL >= playerX &&
            ball.y + BALL >= player.y && ball.y <= player.y + PADDLE_H) {
            hitPaddle(player, playerX, 1)
        }

        if (ball.vx > 0 && ball.x + BALL >= computerX && ball.x <= computerX + PADDLE_W &&
            ball.y + BALL >= computer.y && ball.y <= computer.y + PADDLE_H) {
            hitPaddle(computer, computerX, -1)
        }

        if (ball.x + BALL < 0) score("computer")
        else if (ball.x > W) score("player")
    }

    const draw = () => {
        ctx.clearRect(0, 0, W, H)

        ctx.fillStyle = "rgba(255, 255, 255, .25)"
        for (let y = 10; y < H; y += 30) ctx.fillRect(W / 2 - 1, y, 2, 15)

        ctx.fillStyle = blue
        ctx.fillRect(20, player.y, PADDLE_W, PADDLE_H)

        ctx.fillStyle = red
        ctx.fillRect(W - 20 - PADDLE_W, computer.y, PADDLE_W, PADDLE_H)

        ctx.fillStyle = "#fff"
        ctx.fillRect(ball.x, ball.y, BALL, BALL)
    }

    const loop = time => {
        if (!running) return
        // caps the step so the ball does not jump after switching tabs
        let dt = Math.min((time - lastTime) / 1000, 0.05)
        lastTime = time
        update(dt)
        draw()
        requestAnimationFrame(loop)
    }

    startBtn.addEventListener("click", () => {
        resetGame()
        overlay.hidden = true
        running = true
        lastTime = performance.now()
        requestAnimationFrame(loop)
    })

    // mouse and finger: the paddle follows the pointer
    pongCanvas.addEventListener("pointermove", e => {
        if (!running) return
        let rect = pongCanvas.getBoundingClientRect()
        player.y = (e.clientY - rect.top) * (H / rect.height) - PADDLE_H / 2
        clampPaddle(player)
    })

    document.addEventListener("keydown", e => {
        if (!running || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return
        e.preventDefault() // keeps the page from scrolling while playing
        keys[e.key] = true
    })

    document.addEventListener("keyup", e => {
        keys[e.key] = false
    })

    resetGame()
    draw()
}


/* pac-man game  */

let pacmanCanvas = document.querySelector("#pacman-canvas")

if (pacmanCanvas) {
    const ctx = pacmanCanvas.getContext("2d")
    const overlay = document.querySelector("#pacman-overlay")
    const message = document.querySelector("#pacman-message")
    const startBtn = document.querySelector("#pacman-start")
    const scoreEl = document.querySelector("#pacman-score")
    const livesEl = document.querySelector("#pacman-lives")

    // # wall, . dot, - door of the ghost house, P start of pac-man
    // the open ends of the middle row are a tunnel to the other side
    const MAZE = [
        "###################",
        "#........#........#",
        "#.##.###.#.###.##.#",
        "#.................#",
        "#.##.#.#####.#.##.#",
        "#....#...#...#....#",
        "####.### # ###.####",
        "   #.#       #.#   ",
        "####.# ##-## #.####",
        "    .  #   #  .    ",
        "####.# ##### #.####",
        "   #.#       #.#   ",
        "####.# ##### #.####",
        "#........#........#",
        "#.##.###.#.###.##.#",
        "#..#.....P.....#..#",
        "##.#.#.#####.#.#.##",
        "#....#...#...#....#",
        "#.######.#.######.#",
        "#.................#",
        "###################"
    ]

    const COLS = MAZE[0].length
    const ROWS = MAZE.length
    const W = pacmanCanvas.width
    const H = pacmanCanvas.height
    const TILE = W / COLS
    const PACMAN_SPEED = 7   // tiles per second
    const GHOST_SPEED = 5.5  // slower than pac-man, so the ghosts can be outrun
    const LIVES = 3
    const HOUSE_EXIT = { col: 9, row: 7 }
    const START_ROW = MAZE.findIndex(line => line.includes("P"))
    const START = { col: MAZE[START_ROW].indexOf("P"), row: START_ROW }

    const css = getComputedStyle(document.documentElement)
    const blue = css.getPropertyValue("--Soft-Blue").trim()
    const red = css.getPropertyValue("--Soft-Red").trim()

    const DIRS = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }
    }

    // release: seconds until the ghost leaves the house
    // chase: how often the ghost heads for pac-man instead of turning at random
    const GHOSTS = [
        { color: red, col: 9, row: 7, release: 0, chase: .8 },
        { color: "#ffb8de", col: 8, row: 9, release: 3, chase: .6 },
        { color: "#00e0e0", col: 9, row: 9, release: 6, chase: .45 },
        { color: "#ffb852", col: 10, row: 9, release: 9, chase: .3 }
    ]

    let dots, dotsLeft, pacman, ghosts, nextDir, score, lives, elapsed, pause
    let running = false, lastTime = 0, swipe = null

    const isOpen = (col, row, ghost) => {
        if (row < 0 || row >= ROWS) return false
        let tile = MAZE[row][(col + COLS) % COLS]
        if (tile === "#") return false
        // only ghosts on their way out may pass the door
        if (tile === "-") return Boolean(ghost) && !ghost.out
        return true
    }

    const canMove = (actor, dir, ghost) => isOpen(actor.col + dir.x, actor.row + dir.y, ghost)

    const isReverse = (a, b) => a && b && a.x === -b.x && a.y === -b.y

    // pixel centre of an actor, including the way to the next tile
    const position = actor => ({
        x: (actor.col + (actor.dir ? actor.dir.x * actor.progress : 0) + .5) * TILE,
        y: (actor.row + (actor.dir ? actor.dir.y * actor.progress : 0) + .5) * TILE
    })

    // moves an actor tile by tile; steer() picks the direction at every tile centre
    const move = (actor, distance, steer) => {
        while (distance > 0) {
            if (!actor.dir) {
                steer(actor)
                if (!actor.dir) return
            }

            let rest = 1 - actor.progress
            if (distance < rest) {
                actor.progress += distance
                return
            }

            distance -= rest
            actor.col = (actor.col + actor.dir.x + COLS) % COLS
            actor.row += actor.dir.y
            actor.progress = 0
            steer(actor)
            if (!actor.dir) return
        }
    }

    const endGame = text => {
        running = false
        message.textContent = text
        startBtn.textContent = "play again"
        overlay.hidden = false
        startBtn.focus()
    }

    const steerPacman = p => {
        if (dots[p.row][p.col]) {
            dots[p.row][p.col] = false
            dotsLeft--
            score += 10
            scoreEl.textContent = score
            if (!dotsLeft) endGame("you win!")
        }

        if (nextDir && canMove(p, nextDir)) p.dir = nextDir
        else if (p.dir && !canMove(p, p.dir)) p.dir = null
        if (p.dir) p.facing = p.dir
    }

    const distanceTo = (ghost, dir, target) =>
        (ghost.col + dir.x - target.col) ** 2 + (ghost.row + dir.y - target.row) ** 2

    const steerGhost = g => {
        // once outside, the door stays closed for this ghost
        if (g.row <= HOUSE_EXIT.row) g.out = true

        let all = Object.values(DIRS).filter(d => canMove(g, d, g))
        let options = all.filter(d => !isReverse(d, g.dir))
        // ghosts only turn around in a dead end
        if (!options.length) options = all
        if (!options.length) {
            g.dir = null
            return
        }

        if (!g.out || Math.random() < g.chase) {
            let target = g.out ? pacman : HOUSE_EXIT
            options.sort((a, b) => distanceTo(g, a, target) - distanceTo(g, b, target))
            g.dir = options[0]
        } else {
            g.dir = options[Math.floor(Math.random() * options.length)]
        }
    }

    const resetActors = () => {
        pacman = { ...START, dir: null, facing: DIRS.ArrowLeft, progress: 0 }
        ghosts = GHOSTS.map(g => ({ ...g, dir: null, progress: 0, out: g.row <= HOUSE_EXIT.row }))
        nextDir = null
        elapsed = 0
    }

    const resetGame = () => {
        dots = MAZE.map(line => [...line].map(tile => tile === "."))
        dotsLeft = dots.flat().filter(Boolean).length
        score = 0
        lives = LIVES
        pause = 0
        scoreEl.textContent = score
        livesEl.textContent = lives
        resetActors()
    }

    const loseLife = () => {
        lives--
        livesEl.textContent = lives
        if (!lives) return endGame("game over")
        resetActors()
        pause = 1 // a short breather before the next round
    }

    const update = dt => {
        if (pause > 0) {
            pause -= dt
            return
        }

        // pac-man may turn around at any time, not only at a tile centre
        if (isReverse(nextDir, pacman.dir) && pacman.progress > 0) {
            pacman.col = (pacman.col + pacman.dir.x + COLS) % COLS
            pacman.row += pacman.dir.y
            pacman.progress = 1 - pacman.progress
            pacman.dir = pacman.facing = nextDir
        }

        move(pacman, PACMAN_SPEED * dt, steerPacman)
        if (!running) return

        elapsed += dt
        let p = position(pacman)

        for (let g of ghosts) {
            if (elapsed >= g.release) move(g, GHOST_SPEED * dt, steerGhost)

            let q = position(g)
            if (Math.hypot(p.x - q.x, p.y - q.y) < TILE * .7) return loseLife()
        }
    }

    const drawPacman = time => {
        let { x, y } = position(pacman)
        let angle = Math.atan2(pacman.facing.y, pacman.facing.x)
        let mouth = pacman.dir ? Math.abs(Math.sin(time * 12)) * .7 + .05 : .4

        ctx.fillStyle = "#ffd84d"
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.arc(x, y, TILE * .45, angle + mouth / 2, angle + Math.PI * 2 - mouth / 2)
        ctx.closePath()
        ctx.fill()
    }

    const drawGhost = g => {
        let { x, y } = position(g)
        let r = TILE * .45
        let look = g.dir || DIRS.ArrowUp

        ctx.fillStyle = g.color
        ctx.beginPath()
        ctx.arc(x, y - r * .1, r, Math.PI, 0)
        ctx.lineTo(x + r, y + r)
        ctx.lineTo(x - r, y + r)
        ctx.closePath()
        ctx.fill()

        for (let side of [-1, 1]) {
            let ex = x + side * r * .38
            let ey = y - r * .2

            ctx.fillStyle = "#fff"
            ctx.beginPath()
            ctx.arc(ex, ey, r * .3, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = "#1a1a40"
            ctx.beginPath()
            ctx.arc(ex + look.x * r * .12, ey + look.y * r * .12, r * .15, 0, Math.PI * 2)
            ctx.fill()
        }
    }

    const draw = (time = 0) => {
        ctx.clearRect(0, 0, W, H)

        MAZE.forEach((line, row) => [...line].forEach((tile, col) => {
            if (tile === "#") {
                ctx.fillStyle = blue
                ctx.fillRect(col * TILE, row * TILE, TILE, TILE)
            } else if (tile === "-") {
                ctx.fillStyle = "#ffb8de"
                ctx.fillRect(col * TILE, row * TILE + TILE * .4, TILE, TILE * .2)
            }

            if (dots[row][col]) {
                ctx.fillStyle = "#fff"
                ctx.beginPath()
                ctx.arc((col + .5) * TILE, (row + .5) * TILE, TILE * .12, 0, Math.PI * 2)
                ctx.fill()
            }
        }))

        drawPacman(time)
        ghosts.forEach(drawGhost)
    }

    const loop = time => {
        if (!running) return
        // caps the step so the actors do not jump after switching tabs
        let dt = Math.min((time - lastTime) / 1000, 0.05)
        lastTime = time
        update(dt)
        draw(time / 1000)
        if (running) requestAnimationFrame(loop)
    }

    startBtn.addEventListener("click", () => {
        resetGame()
        overlay.hidden = true
        running = true
        lastTime = performance.now()
        requestAnimationFrame(loop)
    })

    document.addEventListener("keydown", e => {
        if (!running || !DIRS[e.key]) return
        e.preventDefault() // keeps the page from scrolling while playing
        nextDir = DIRS[e.key]
    })

    // finger (or mouse drag): every swipe of 20px sets the next direction
    pacmanCanvas.addEventListener("pointerdown", e => {
        swipe = { x: e.clientX, y: e.clientY }
    })

    pacmanCanvas.addEventListener("pointermove", e => {
        if (!running || !swipe) return
        let dx = e.clientX - swipe.x
        let dy = e.clientY - swipe.y
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return

        if (Math.abs(dx) > Math.abs(dy)) nextDir = dx > 0 ? DIRS.ArrowRight : DIRS.ArrowLeft
        else nextDir = dy > 0 ? DIRS.ArrowDown : DIRS.ArrowUp
        swipe = { x: e.clientX, y: e.clientY }
    })

    for (let type of ["pointerup", "pointercancel"]) {
        pacmanCanvas.addEventListener(type, () => { swipe = null })
    }

    resetGame()
    draw()
}
