const fs = require('fs');
const axios = require('axios');
const colors = require('colors');
const { HttpsProxyAgent } = require('https-proxy-agent');

class GLaDOS {
    constructor() {
        this.authUrl = 'https://major.glados.app/api/auth/tg/';
        this.userInfoUrl = 'https://major.glados.app/api/users/';
        this.streakUrl = 'https://major.glados.app/api/user-visits/streak/';
        this.visitUrl = 'https://major.glados.app/api/user-visits/visit/';
        this.rouletteUrl = 'https://major.glados.app/api/roulette';
        this.holdCoinsUrl = 'https://major.glados.app/api/bonuses/coins/';
        this.tasksUrl = 'https://major.glados.app/api/tasks/';
        this.proxies = fs.readFileSync('proxy.txt', 'utf8').split('\n').filter(Boolean);
    }

    headers(token = null) {
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'Content-Type': 'application/json',
            'Origin': 'https://major.glados.app',
            'Referer': 'https://major.glados.app/?tgWebAppStartParam=376905749',
            'Sec-Ch-Ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            process.stdout.write(`\r[*] Waiting ${i} seconds to continue...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', { httpsAgent: proxyAgent });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Cannot check IP of proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error checking IP of proxy: ${error.message}`);
        }
    }

    async makeRequest(method, url, data = null, token = null, proxyIndex) {
        const headers = this.headers(token);
        const proxy = this.proxies[proxyIndex];
        const httpsAgent = new HttpsProxyAgent(proxy);

        try {
            const config = {
                method,
                url,
                headers,
                httpsAgent,
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            this.log(`Error: ${error.message}`);
            return null;
        }
    }

    async authenticate(init_data, proxyIndex) {
        return this.makeRequest('POST', this.authUrl, { init_data }, null, proxyIndex);
    }

    async getUserInfo(userId, token, proxyIndex) {
        return this.makeRequest('GET', `${this.userInfoUrl}${userId}/`, null, token, proxyIndex);
    }

    async getStreak(token, proxyIndex) {
        return this.makeRequest('GET', this.streakUrl, null, token, proxyIndex);
    }

    async postVisit(token, proxyIndex) {
        return this.makeRequest('POST', this.visitUrl, {}, token, proxyIndex);
    }

    async spinRoulette(token, proxyIndex) {
        try {
            const result = await this.makeRequest('POST', this.rouletteUrl, {}, token, proxyIndex);
            if (result && result.rating_award > 0) {
                this.log(`Successfully spun, received ${result.rating_award} stars`.green);
            } else {
                this.log(`Spin failed, need to invite more friends or wait for the next day`.yellow);
            }
            return result;
        } catch (error) {
            this.log(`Cannot spin today`.yellow);
            return null;
        }
    }

    async holdCoins(token, proxyIndex) {
        const coins = Math.floor(Math.random() * (950 - 900 + 1)) + 900;
        const result = await this.makeRequest('POST', this.holdCoinsUrl, { coins }, token, proxyIndex);
        if (result && result.success) {
            this.log(`Successfully held coins, received ${coins} stars`.green);
        } else if (result) {
            this.log(`Failed to hold coins`.red);
        } else {
            this.log(`You have already held coins today`.red);
        }
        return result;
    }

    async getDailyTasks(token, proxyIndex) {
        const tasks = await this.makeRequest('GET', `${this.tasksUrl}?is_daily=false`, null, token, proxyIndex);
        if (tasks) {
            this.log(`Task list:`.magenta);
            tasks.forEach(task => this.log(`- ${task.id}: ${task.title}`));
        } else {
            this.log(`Error getting daily tasks`.red);
        }
        return tasks;
    }

    async completeTask(token, task, proxyIndex) {
        const result = await this.makeRequest('POST', this.tasksUrl, { task_id: task.id }, token, proxyIndex);
        if (result && result.is_completed) {
            this.log(`Completed task ${task.id}: ${task.title.yellow} .. status: success`.green);
        } else if (result) {
            this.log(`Cannot complete task ${task.id}: ${task.title}`.red);
        }
        return result;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async main() {
        const dataFile = 'data.txt';
        const data = fs.readFileSync(dataFile, 'utf8')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const init_data = data[i].trim();
                const proxyIndex = i % this.proxies.length;

                try {
                    const proxyIP = await this.checkProxyIP(this.proxies[proxyIndex]);
                    const authResult = await this.authenticate(init_data, proxyIndex);
                    
                    if (authResult) {
                        const { access_token, user } = authResult;
                        const { id, first_name } = user;

                        console.log(`========== Account ${i + 1} | ${first_name.green} | IP: ${proxyIP} ==========`);

                        const userInfo = await this.getUserInfo(id, access_token, proxyIndex);
                        if (userInfo) {
                            this.log(`Current stars: ${userInfo.rating.toString().white}`.green);
                        }

                        const streakInfo = await this.getStreak(access_token, proxyIndex);
                        if (streakInfo) {
                            this.log(`Checked in for ${streakInfo.streak} days!`.green);
                        }

                        const visitResult = await this.postVisit(access_token, proxyIndex);
                        if (visitResult) {
                            if (visitResult.is_increased) {
                                this.log(`Successfully checked in for day ${visitResult.streak}`.green);
                            } else {
                                this.log(`Already checked in. Current streak: ${visitResult.streak}`.yellow);
                            }
                        }

                        await this.spinRoulette(access_token, proxyIndex);
                        await this.holdCoins(access_token, proxyIndex);

                        const tasks = await this.getDailyTasks(access_token, proxyIndex);
                        if (tasks) {
                            for (const task of tasks) {
                                await this.completeTask(access_token, task, proxyIndex);
                                await this.sleep(1000);
                            }
                        }

                    } else {
                        this.log(`Cannot read account data ${i + 1}`);
                    }

                    if (i < data.length - 1) {
                        await this.waitWithCountdown(3);
                    }
                } catch (error) {
                    this.log(`Cannot read account data ${i + 1}: ${error.message}`);
                    continue;
                }
            }
            await this.waitWithCountdown(28850);
        }
    }
}

if (require.main === module) {
    const glados = new GLaDOS();
    glados.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
