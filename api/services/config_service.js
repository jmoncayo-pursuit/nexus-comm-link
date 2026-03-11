import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ConfigService {
    constructor() {
        this.projectRoot = join(__dirname, '../../..');
        // Look for internal config first, then project root (though we prefer internal now)
        this.internalConfigPath = join(__dirname, '../../config/target.json');
        this.projectConfigPath = join(this.projectRoot, 'nexus.config.json');
        this.config = this.loadConfig();
    }

    loadConfig() {
        // Try internal first (decoupled)
        try {
            if (fs.existsSync(this.internalConfigPath)) {
                return JSON.parse(fs.readFileSync(this.internalConfigPath, 'utf8'));
            }
        } catch (e) { }

        // Fallback to project root
        try {
            if (fs.existsSync(this.projectConfigPath)) {
                return JSON.parse(fs.readFileSync(this.projectConfigPath, 'utf8'));
            }
        } catch (e) { }

        // Fallback Defaults
        return {
            name: "Universal Project",
            boot: this.findStandardScript(['dev.sh', 'start.sh', 'start_server.sh', 'npm run dev']),
            stop: this.findStandardScript(['stop.sh', 'stop_server.sh', 'kill_server.sh']),
            healthUrl: "http://localhost:8000"
        };
    }

    findStandardScript(options) {
        for (const opt of options) {
            if (opt.includes(' ')) return opt;
            if (fs.existsSync(join(this.projectRoot, opt))) return `./${opt}`;
        }
        return null;
    }

    getBootCommand() { return this.config.boot; }
    getStopCommand() { return this.config.stop; }
    getHealthUrl() { return this.config.healthUrl || "http://localhost:8000"; }
    getProjectName() { return this.config.name || "Nexus Project"; }
}

export const configService = new ConfigService();
