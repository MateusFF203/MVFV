const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const { execSync } = require("child_process");

class MVFV {
    constructor() {
        this.vars = Object.create(null);
        this.permissions = Object.create(null);
        this.securityMode = "dev";
        this.blocked = new Set();
        this.logs = [];
    }

    execute(rawLine) {
        const line = this._normalizeLine(rawLine);
        if (!line) {
            return;
        }

        if (line.startsWith("print ")) {
            this._assertAllowed("print");
            const value = this.parseValue(line.slice(6));
            console.log(value);
            this._log("print", true, "ok");
            return;
        }

        if (line.startsWith("let ") || line.startsWith("var ")) {
            this._assertAllowed("var");
            const match = line.match(/^(?:let|var)\s+(\w+)\s*=\s*(.+)$/);
            if (!match) {
                throw new Error("Invalid variable syntax. Use: var name = value");
            }

            const [, name, valueExpr] = match;
            this.vars[name] = this.parseValue(valueExpr);
            this._log("var", true, `set ${name}`);
            return;
        }

        if (line.startsWith("add ")) {
            this._assertAllowed("math");
            const match = line.match(/^add\s+(\w+)\s+(.+)$/);
            if (!match) {
                throw new Error("Invalid add syntax. Use: add variable value");
            }

            const [, name, valueExpr] = match;
            this._requireVariable(name);
            this.vars[name] = Number(this.vars[name]) + Number(this.parseValue(valueExpr));
            this._log("math", true, `add ${name}`);
            return;
        }

        if (line.startsWith("sub ")) {
            this._assertAllowed("math");
            const match = line.match(/^sub\s+(\w+)\s+(.+)$/);
            if (!match) {
                throw new Error("Invalid sub syntax. Use: sub variable value");
            }

            const [, name, valueExpr] = match;
            this._requireVariable(name);
            this.vars[name] = Number(this.vars[name]) - Number(this.parseValue(valueExpr));
            this._log("math", true, `sub ${name}`);
            return;
        }

        if (line.startsWith("show ")) {
            this._assertAllowed("show");
            const name = line.slice(5).trim();
            console.log(this.vars[name]);
            this._log("show", true, name);
            return;
        }

        if (line.startsWith("sec.mode ")) {
            const mode = line.slice("sec.mode ".length).trim().toLowerCase();
            if (!["dev", "sandbox", "strict"].includes(mode)) {
                throw new Error("Invalid security mode. Use: dev | sandbox | strict");
            }

            this.securityMode = mode;
            console.log(`Security mode set to: ${mode}`);
            this._log("sec.mode", true, mode);
            return;
        }

        if (line.startsWith("sec.allow ")) {
            const permission = line.slice("sec.allow ".length).trim();
            if (!permission) {
                throw new Error("sec.allow requires a command name");
            }

            this.permissions[permission] = true;
            this.blocked.delete(permission);
            console.log(`Permission allowed: ${permission}`);
            this._log("sec.allow", true, permission);
            return;
        }

        if (line.startsWith("sec.block ")) {
            const permission = line.slice("sec.block ".length).trim();
            if (!permission) {
                throw new Error("sec.block requires a command name");
            }

            this.permissions[permission] = false;
            this.blocked.add(permission);
            console.log(`Command blocked: ${permission}`);
            this._log("sec.block", true, permission);
            return;
        }

        if (line === "sec.report") {
            this._printSecurityReport();
            this._log("sec.report", true, "ok");
            return;
        }

        if (line === "sec.sys.info") {
            this._assertAllowed("sec.sys.info");
            this._printSystemInfo();
            this._log("sec.sys.info", true, "ok");
            return;
        }

        if (line.startsWith("sec.file.hash")) {
            this._assertAllowed("sec.file.hash");
            this._handleFileHash(line);
            this._log("sec.file.hash", true, "ok");
            return;
        }

        if (line.startsWith("sec.net.ports")) {
            this._assertAllowed("sec.net.ports");
            this._handleNetPorts(line);
            this._log("sec.net.ports", true, "ok");
            return;
        }

        if (line.startsWith("sec.proc.scan")) {
            this._assertAllowed("sec.proc.scan");
            this._handleProcessScan(line);
            this._log("sec.proc.scan", true, "ok");
            return;
        }

        if (line.startsWith("net.ping")) {
            this._assertAllowed("net.ping");
            const host = this._extractHost(line, "net.ping");
            this._runPing(host);
            this._log("net.ping", true, host);
            return;
        }

        if (line.startsWith("net.check")) {
            this._assertAllowed("net.check");
            const host = this._extractHost(line, "net.check");
            this._runPing(host);
            this._log("net.check", true, host);
            return;
        }

        console.log(`Unknown command: ${line}`);
        this._log("unknown", false, line);
    }

    parseValue(rawValue) {
        if (rawValue === undefined || rawValue === null) {
            return "";
        }

        const value = String(rawValue).trim();

        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }

        if (value === "true") {
            return true;
        }

        if (value === "false") {
            return false;
        }

        if (!Number.isNaN(Number(value))) {
            return Number(value);
        }

        if (Object.prototype.hasOwnProperty.call(this.vars, value)) {
            return this.vars[value];
        }

        return value;
    }

    _normalizeLine(rawLine) {
        if (!rawLine) {
            return "";
        }

        const line = rawLine.trim();
        if (!line || line.startsWith("#") || line.startsWith("//")) {
            return "";
        }

        return line;
    }

    _requireVariable(name) {
        if (!Object.prototype.hasOwnProperty.call(this.vars, name)) {
            throw new Error(`Variable not found: ${name}`);
        }
    }

    _assertAllowed(command) {
        const safeAlways = new Set(["sec.mode", "sec.allow", "sec.block", "sec.report"]);

        if (safeAlways.has(command)) {
            return;
        }

        if (this.blocked.has(command)) {
            throw new Error(`Blocked by security policy: ${command}`);
        }

        if (this.securityMode === "strict") {
            if (!this.permissions[command]) {
                throw new Error(`Permission denied in strict mode: ${command}`);
            }
        }

        if (this.securityMode === "sandbox") {
            const sandboxRestricted = new Set(["net.ping", "net.check", "sec.net.ports", "sec.proc.scan"]);
            if (sandboxRestricted.has(command) && !this.permissions[command]) {
                throw new Error(`Permission denied in sandbox mode: ${command}`);
            }
        }
    }

    _log(command, allowed, reason) {
        this.logs.push({
            time: new Date().toISOString(),
            command,
            allowed,
            reason,
        });
    }

    _printSecurityReport() {
        const allowedCount = this.logs.filter((x) => x.allowed).length;
        const blockedCount = this.logs.length - allowedCount;

        console.log("=== MVFV Security Report ===");
        console.log(`Mode: ${this.securityMode}`);
        console.log(`Allowed events: ${allowedCount}`);
        console.log(`Blocked events: ${blockedCount}`);
        console.log(`Blocked commands: ${Array.from(this.blocked).join(", ") || "none"}`);
        console.log(`Explicit permissions: ${Object.keys(this.permissions).length}`);
    }

    _printSystemInfo() {
        console.log("=== MVFV System Info ===");
        console.log(`Hostname: ${os.hostname()}`);
        console.log(`Platform: ${os.platform()} ${os.release()}`);
        console.log(`Architecture: ${os.arch()}`);
        console.log(`CPU cores: ${os.cpus().length}`);
        console.log(`Total memory GB: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}`);
        console.log(`Free memory GB: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)}`);
        console.log(`Uptime sec: ${Math.floor(os.uptime())}`);
    }

    _handleFileHash(line) {
        const tokens = this._splitArgs(line);
        if (tokens.length < 2) {
            throw new Error("Usage: sec.file.hash <path> [sha256|sha1|md5]");
        }

        const filePath = this._resolveFilePath(tokens[1]);
        const algorithm = (tokens[2] || "sha256").toLowerCase();
        const allowedAlgorithms = new Set(["sha256", "sha1", "md5"]);

        if (!allowedAlgorithms.has(algorithm)) {
            throw new Error("Invalid hash algorithm. Use sha256, sha1, or md5.");
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const data = fs.readFileSync(filePath);
        const digest = crypto.createHash(algorithm).update(data).digest("hex");
        console.log(`hash(${algorithm}) ${filePath}`);
        console.log(digest);
    }

    _handleNetPorts(line) {
        const tokens = this._splitArgs(line);
        const limit = Math.max(1, Math.min(200, Number(tokens[1] || 20)));

        let output;
        try {
            output = execSync("netstat -ano -p tcp", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        } catch {
            throw new Error("Unable to read TCP listeners using netstat.");
        }

        const listeners = output
            .split(/\r?\n/)
            .map((x) => x.trim())
            .filter((x) => x.includes("LISTENING"))
            .map((lineText) => lineText.split(/\s+/))
            .filter((parts) => parts.length >= 5)
            .map((parts) => ({ local: parts[1], pid: parts[4] }));

        const unique = [];
        const seen = new Set();
        for (const item of listeners) {
            if (!seen.has(item.local)) {
                seen.add(item.local);
                unique.push(item);
            }
        }

        console.log(`TCP listeners (top ${limit}):`);
        unique.slice(0, limit).forEach((item) => {
            console.log(` - ${item.local} (PID ${item.pid})`);
        });

        if (unique.length === 0) {
            console.log("No listening TCP ports found.");
        }
    }

    _handleProcessScan(line) {
        const tokens = this._splitArgs(line);
        const keyword = (tokens[1] || "").toLowerCase();
        const suspicious = ["cheatengine", "aimbot", "trainer", "injector", "wallhack", "speedhack", "hack"];

        let output;
        try {
            output = execSync("tasklist /fo csv /nh", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        } catch {
            throw new Error("Unable to read process list with tasklist.");
        }

        const rows = output.split(/\r?\n/).filter(Boolean);
        const matches = [];

        for (const row of rows) {
            const cols = this._parseCsvRow(row);
            if (cols.length < 2) {
                continue;
            }

            const name = (cols[0] || "").trim();
            const pid = (cols[1] || "").trim();
            const lower = name.toLowerCase();

            const isMatch = keyword
                ? lower.includes(keyword)
                : suspicious.some((item) => lower.includes(item));

            if (isMatch) {
                matches.push({ name, pid });
            }
        }

        if (matches.length === 0) {
            console.log("No suspicious processes found.");
            return;
        }

        console.log(`Suspicious processes: ${matches.length}`);
        matches.forEach((item) => {
            console.log(` - ${item.name} (PID ${item.pid})`);
        });
    }

    _extractHost(line, commandName) {
        const host = line.slice(commandName.length).trim() || "localhost";
        if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
            throw new Error(`Invalid host: ${host}`);
        }

        return host;
    }

    _runPing(host) {
        try {
            const pingCommand = process.platform === "win32" ? `ping -n 1 ${host}` : `ping -c 1 ${host}`;
            const output = execSync(pingCommand, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
            const firstLine = output.split(/\r?\n/).find((x) => x.trim());
            console.log(firstLine || `Ping succeeded: ${host}`);
        } catch {
            throw new Error(`Host unreachable: ${host}`);
        }
    }

    _resolveFilePath(inputPath) {
        const parsed = this.parseValue(inputPath);
        return path.resolve(String(parsed));
    }

    _splitArgs(text) {
        const args = [];
        let current = "";
        let quote = null;
        let escape = false;

        for (const ch of text.trim()) {
            if (escape) {
                current += ch;
                escape = false;
                continue;
            }

            if (ch === "\\" && quote) {
                escape = true;
                continue;
            }

            if (quote) {
                if (ch === quote) {
                    quote = null;
                } else {
                    current += ch;
                }
                continue;
            }

            if (ch === "\"" || ch === "'") {
                quote = ch;
                continue;
            }

            if (/\s/.test(ch)) {
                if (current) {
                    args.push(current);
                    current = "";
                }
                continue;
            }

            current += ch;
        }

        if (current) {
            args.push(current);
        }

        return args;
    }

    _parseCsvRow(row) {
        const values = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const ch = row[i];

            if (ch === "\"") {
                if (inQuotes && row[i + 1] === "\"") {
                    current += "\"";
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (ch === "," && !inQuotes) {
                values.push(current);
                current = "";
                continue;
            }

            current += ch;
        }

        values.push(current);
        return values;
    }
}

function printUsage() {
    console.log("MVFV executor");
    console.log("Usage:");
    console.log("  mvfv run <file.mvfv>");
    console.log("  mvfv repl");
    console.log("  mvfv help");
    console.log("  mvfv version");
}

function runFile(filePath) {
    if (!filePath) {
        throw new Error("Missing .mvfv file path.");
    }

    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`File not found: ${resolved}`);
    }

    const interpreter = new MVFV();
    const code = fs.readFileSync(resolved, "utf8");

    console.log(`[MVFV] Running: ${resolved}`);
    code.split(/\r?\n/).forEach((line, index) => {
        try {
            interpreter.execute(line);
        } catch (err) {
            throw new Error(`Line ${index + 1}: ${err.message}`);
        }
    });
}

function runRepl() {
    console.log("MVFV REPL started. Type 'exit' to quit.");
    const interpreter = new MVFV();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "mvfv> ",
    });

    rl.prompt();
    rl.on("line", (line) => {
        const trimmed = line.trim();
        if (trimmed === "exit") {
            rl.close();
            return;
        }

        if (trimmed === "help") {
            printUsage();
            rl.prompt();
            return;
        }

        try {
            interpreter.execute(trimmed);
        } catch (err) {
            console.error(`[ERROR] ${err.message}`);
        }

        rl.prompt();
    });
}

function main() {
    const args = process.argv.slice(2);
    const command = (args[0] || "help").toLowerCase();

    try {
        if (command === "run" || command === "mvfv.run") {
            runFile(args[1]);
            return;
        }

        if (command === "repl" || command === "mvfv.repl") {
            runRepl();
            return;
        }

        if (command === "version") {
            console.log("MVFV executor v1.1.0");
            return;
        }

        if (command === "help") {
            printUsage();
            return;
        }

        console.error(`[ERROR] Invalid command: ${command}`);
        printUsage();
        process.exitCode = 1;
    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        process.exitCode = 1;
    }
}

main();
