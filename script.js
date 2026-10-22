const input = document.getElementById("cmd");
const output = document.getElementById("output");
const bash = document.getElementById("bash");
const promptEl = document.querySelector(".prompt");

const HOME = ["home", "user"];
let cwd = [...HOME];

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
    return `user@fakebash:${dir}$`;
}

function updatePrompt() {
    promptEl.textContent = promptText();
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
        "  pwd            print working directory\n" +
        "  date           show the current date and time\n" +
        "  clear          clear the screen",

    ls: (args) => {
        const target = args[0] ? resolvePath(args[0]) : cwd;
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
        const node = getNode(target);
        if (node === undefined) return `bash: cd: ${args[0]}: No such file or directory`;
        if (!isDir(node)) return `bash: cd: ${args[0]}: Not a directory`;
        cwd = target;
        updatePrompt();
        return null;
    },

    cat: (args) => {
        if (!args[0]) return "cat: missing file name";
        const node = getNode(resolvePath(args[0]));
        if (node === undefined) return `cat: ${args[0]}: No such file or directory`;
        if (isDir(node)) return `cat: ${args[0]}: Is a directory`;
        return node;
    },

    echo: (args) => args.join(" "),
    whoami: () => "user",
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
    const command = commands[name];

    if (command) {
        const result = command(args);
        if (result !== null) print(result);
    } else {
        print(`bash: ${name}: command not found`);
    }
}

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const value = input.value;
        run(value);
        if (value.trim() !== "") history.push(value);
        historyIndex = history.length;
        input.value = "";
        bash.scrollTop = bash.scrollHeight;
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
