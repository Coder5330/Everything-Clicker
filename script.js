const input = document.getElementById("cmd");
const output = document.getElementById("output");
const bash = document.getElementById("bash");
const promptEl = document.querySelector(".prompt");

const PASSWORD_SALT = "fakebash-v1";
const ADMIN_HASH = "8f6c66774a8c84dd1e92b56244edcc13a72a6b4c387188c77ea247bb50af80ea";

const SHA_K = [];
const SHA_H = [];
for (let n = 2, count = 0; count < 64; n++) {
    let isPrime = true;
    for (let d = 2; d * d <= n; d++) {
        if (n % d === 0) {
            isPrime = false;
            break;
        }
    }
    if (!isPrime) continue;
    if (count < 8) SHA_H[count] = (Math.pow(n, 1 / 2) * 2 ** 32) | 0;
    SHA_K[count] = (Math.pow(n, 1 / 3) * 2 ** 32) | 0;
    count++;
}

function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
}

function sha256(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bitLength >>> (i * 8)) & 0xff);

    const h = SHA_H.slice();
    const w = new Array(64);

    for (let off = 0; off < bytes.length; off += 64) {
        for (let i = 0; i < 16; i++) {
            w[i] =
                (bytes[off + 4 * i] << 24) |
                (bytes[off + 4 * i + 1] << 16) |
                (bytes[off + 4 * i + 2] << 8) |
                bytes[off + 4 * i + 3];
        }
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }

        let [a, b, c, d, e, f, g, hh] = h;
        for (let i = 0; i < 64; i++) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (hh + S1 + ch + SHA_K[i] + w[i]) | 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) | 0;
            hh = g;
            g = f;
            f = e;
            e = (d + t1) | 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) | 0;
        }
        const added = [a, b, c, d, e, f, g, hh];
        for (let i = 0; i < 8; i++) h[i] = (h[i] + added[i]) | 0;
    }

    return h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

function checkAdminPassword(attempt) {
    return sha256(PASSWORD_SALT + attempt) === ADMIN_HASH;
}

const HOMES = { user: ["home", "user"], admin: ["root"] };

let currentUser = "user";
let HOME = [...HOMES.user];
let cwd = [...HOME];
let waitingForPassword = false;

const history = [];
let historyIndex = 0;

const fs = {
    home: {
        user: {
            documents: {
                "todo.txt": "Find the secret",
                projects: {
                    DO_NOT_LOOK: {
                        secret: {
                            supersecret: {
                                "secret.txt": "The password is 00110110 00110010 00100000 00110101 00111000 00100000 00110110 01000011 00100000 00110111 01000001 00100000 00110101 01000001 00100000 00110101 00110111 00100000 00110100 01000101 00100000 00110111 00111001 00100000 00110101 01000001 00100000 00110101 00111000 00100000 00110101 00110010 00100000 00110111 00110111 00100000 00110101 00111001 00100000 00110101 00111000 00100000 00110100 01000101 00100000 00110111 01000001 00100000 00110110 00110100 00100000 00110011 00110010 00100000 00110011 00111001 00100000 00110111 00111001 00100000 00110101 01000001 00100000 00110100 00110100 00100000 00110100 00110101 00100000 00110111 00111001 00100000 00110100 01000100 00100000 00110011 00110011 00100000 00110100 00110010 00100000 00110111 00110011 00100000 00110110 00110011 00100000 00110011 00110010 00100000 00110101 00110010 00100000 00110111 00110110 00100000 00110110 00110010 00100000 00110110 01000101 00100000 00110101 00110010 00100000 00110110 01000110 00100000 00110101 00111001 00100000 00110101 00110111 00100000 00110100 01000101 00100000 00110111 00110010"
                            }
                        }
                    }
                }
            },
            pictures: {
                "cat.txt": "Not here"
            }
        }
    },
    etc: {
        "hostname": "fakebash"
    }
};

function resolvePath(str) {
    let parts;
    if (str.startsWith("/")) parts = [];
    else if (str === "~" || str.startsWith("~/")) {
        parts = [...HOME];
        str = str.slice(1);
    } else parts = [...cwd];

    for (const seg of str.split("/")) {
        if (seg === "" || seg === ".") continue;
        if (seg === "..") parts.pop();
        else parts.push(seg);
    }
    return parts;
}

function getNode(parts) {
    let node = fs;
    for (const seg of parts) {
        if (typeof node !== "object" || !(seg in node)) return undefined;
        node = node[seg];
    }
    return node;
}

function isDir(node) {
    return typeof node === "object" && node !== null;
}

function isForbidden(parts) {
    return parts[0] === "root" && currentUser !== "admin";
}

function pathString(parts) {
    return "/" + parts.join("/");
}

function promptText() {
    const isInHome = HOME.every((seg, i) => cwd[i] === seg);
    let dir;
    if (isInHome) {
        const rest = cwd.slice(HOME.length);
        dir = rest.length ? "~/" + rest.join("/") : "~";
    } else {
        dir = pathString(cwd);
    }
    const symbol = currentUser === "admin" ? "#" : "$";
    return `${currentUser}@fakebash:${dir}${symbol}`;
}

function updatePrompt() {
    promptEl.textContent = promptText();
}

function switchUser(name) {
    currentUser = name;
    HOME = [...HOMES[name]];
    cwd = [...HOME];
    updatePrompt();
}

const commands = {
    help: () =>
        "Available commands:\n" +
        "  help           show this message\n" +
        "  ls [dir]       list files\n" +
        "  cd [dir]       change directory\n" +
        "  cat <file>     show a file's contents\n" +
        "  echo <text>    print text\n" +
        "  whoami         show current user\n" +
        "  su <user>      switch user\n" +
        "  exit           log out of the current user\n" +
        "  pwd            print working directory\n" +
        "  date           show the current date and time\n" +
        "  clear          clear the screen",

    ls: (args) => {
        const target = args[0] ? resolvePath(args[0]) : cwd;
        if (isForbidden(target)) return `ls: cannot open directory '${args[0] ?? "."}': Permission denied`;
        const node = getNode(target);
        if (node === undefined) return `ls: cannot access '${args[0]}': No such file or directory`;
        if (!isDir(node)) return args[0];
        const names = Object.keys(node).map((name) => (isDir(node[name]) ? name + "/" : name));
        return names.join("  ");
    },

    cd: (args) => {
        if (args.length === 0) {
            cwd = [...HOME];
            updatePrompt();
            return null;
        }
        const target = resolvePath(args[0]);
        if (isForbidden(target)) return `bash: cd: ${args[0]}: Permission denied`;
        const node = getNode(target);
        if (node === undefined) return `bash: cd: ${args[0]}: No such file or directory`;
        if (!isDir(node)) return `bash: cd: ${args[0]}: Not a directory`;
        cwd = target;
        updatePrompt();
        return null;
    },

    cat: (args) => {
        if (!args[0]) return "cat: missing file name";
        const target = resolvePath(args[0]);
        if (isForbidden(target)) return `cat: ${args[0]}: Permission denied`;
        const node = getNode(target);
        if (node === undefined) return `cat: ${args[0]}: No such file or directory`;
        if (isDir(node)) return `cat: ${args[0]}: Is a directory`;
        return node;
    },

    su: (args) => {
        const name = args[0] ?? "admin";
        if (name === currentUser) return null;
        if (name !== "admin") return `su: user ${name} does not exist`;
        waitingForPassword = true;
        input.type = "password";
        promptEl.textContent = "Password:";
        return null;
    },

    exit: () => {
        if (currentUser === "user") return "exit: you are not logged in as another user";
        switchUser("user");
        return null;
    },

    echo: (args) => args.join(" "),
    whoami: () => currentUser,
    pwd: () => pathString(cwd),
    date: () => new Date().toString(),

    clear: () => {
        output.innerHTML = "";
        return null;
    }
};

function print(text) {
    const p = document.createElement("p");
    p.textContent = text;
    output.appendChild(p);
}

function run(rawInput) {
    print(`${promptText()} ${rawInput}`);

    const trimmed = rawInput.trim();
    if (trimmed === "") return;

    const [name, ...args] = trimmed.split(/\s+/);
    const command = Object.prototype.hasOwnProperty.call(commands, name) ? commands[name] : null;

    if (command) {
        const result = command(args);
        if (result !== null) print(result);
    } else {
        print(`bash: ${name}: command not found`);
    }
}

function submitPassword(attempt) {
    waitingForPassword = false;
    input.type = "text";
    print("Password:");

    if (checkAdminPassword(attempt)) {
        switchUser("admin");
        location.href = "https://everything-clicker.vercel.app/x.html";
    } else {
        print("su: Authentication failure");
        updatePrompt();
    }
}

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const value = input.value;
        input.value = "";

        if (waitingForPassword) {
            submitPassword(value);
        } else {
            run(value);
            if (value.trim() !== "") history.push(value);
            historyIndex = history.length;
        }
        bash.scrollTop = bash.scrollHeight;
    } else if (waitingForPassword) {
        return;
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            input.value = history[historyIndex];
        }
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
            historyIndex++;
            input.value = history[historyIndex];
        } else {
            historyIndex = history.length;
            input.value = "";
        }
    }
});

bash.addEventListener("click", () => input.focus());

updatePrompt();
