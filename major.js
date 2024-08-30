const fs = require('fs');
const axios = require('axios');
const colors = require('colors');

class GLaDOS {
    constructor() {
        this.authUrl = 'https://major.glados.app/api/auth/tg/';
        this.userInfoUrl = 'https://major.glados.app/api/users/';
        this.streakUrl = 'https://major.glados.app/api/user-visits/streak/';
        this.visitUrl = 'https://major.glados.app/api/user-visits/visit/';
        this.rouletteUrl = 'https://major.glados.app/api/roulette';
        this.holdCoinsUrl = 'https://major.glados.app/api/bonuses/coins/';
        this.tasksUrl = 'https://major.glados.app/api/tasks/';
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

    async authenticate(init_data) {
        const headers = this.headers();
        const payload = { init_data };

        try {
            const response = await axios.post(this.authUrl, payload, { headers });
            return response.data;
        } catch (error) {
            this.log(`Error during authentication: ${error.message}`);
            return null;
        }
    }

    async getUserInfo(userId, token) {
        const headers = this.headers(token);

        try {
            const response = await axios.get(`${this.userInfoUrl}${userId}/`, { headers });
            return response.data;
        } catch (error) {
            this.log(`Error getting user info: ${error.message}`);
            return null;
        }
    }

    async getStreak(token) {
        const headers = this.headers(token);

        try {
            const response = await axios.get(this.streakUrl, { headers });
            return response.data;
        } catch (error) {
            this.log(`Error getting streak: ${error.message}`);
            return null;
        }
    }

    async postVisit(token) {
        const headers = this.headers(token);

        try {
            const response = await axios.post(this.visitUrl, {}, { headers });
            return response.data;
        } catch (error) {
            this.log(`Error posting visit: ${error.message}`);
            return null;
        }
    }

    async spinRoulette(token) {
        const headers = this.headers(token);

        try {
            const response = await axios.post(this.rouletteUrl, {}, { headers });
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                return error.response.data;
            }
            this.log(`Error spinning roulette: ${error.message}`);
            return null;
        }
    }

    async holdCoins(token) {
        const headers = this.headers(token);
        const coins = Math.floor(Math.random() * (950 - 900 + 1)) + 900; 
        const payload = { coins };

        try {
            const response = await axios.post(this.holdCoinsUrl, payload, { headers });
            if (response.data.success) {
                this.log(`Successfully held ${coins} coins`.green);
            } else {
                this.log(`Failed to hold coins`.red);
            }
            return response.data;
        } catch (error) {
            this.log(`You have already held coins today`.red);
            return null;
        }
    }

    async getDailyTasks(token) {
        const headers = this.headers(token);

        try {
            const response = await axios.get(`${this.tasksUrl}?is_daily=false`, { headers });
            const tasks = response.data.map(task => ({ id: task.id, title: task.title }));
            this.log(`Task list:`.magenta);
            tasks.forEach(task => this.log(`- ${task.id}: ${task.title}`));
            return tasks;
        } catch (error) {
            this.log(`Error getting daily tasks: ${error.message}`.red);
            return null;
        }
    }

    async completeTask(token, task) {
        const headers = this.headers(token);
        const payload = { task_id: task.id };

        try {
            const response = await axios.post(this.tasksUrl, payload, { headers });
            if (response.data.is_completed) {
                this.log(`Task ${task.id}: ${task.title.yellow} .. Status: Success`.green);
            } else {
                // this.log(`Task ${task.id}: ${task.title.yellow} .. Status: Failed`.red);
            }
            return response.data;
        } catch (error) {
            this.log(`Cannot complete task ${task.id}: ${task.title}`.red);
            return null;
        }
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

                const authResult = await this.authenticate(init_data);
                if (authResult) {
                    const { access_token, user } = authResult;
                    const { id, first_name } = user;

                    console.log(`========== Account ${i + 1} | ${first_name.green} ==========`);

                    const userInfo = await this.getUserInfo(id, access_token);
                    if (userInfo) {
                        this.log(`Current stars: ${userInfo.rating.toString().white}`.green);
                    }

                    const streakInfo = await this.getStreak(access_token);
                    if (streakInfo) {
                        this.log(`Checked in for ${streakInfo.streak} days!`.green);
                    }

                    const visitResult = await this.postVisit(access_token);
                    if (visitResult) {
                        if (visitResult.is_increased) {
                            this.log(`Checked in successfully on day ${visitResult.streak}`.green);
                        } else {
                            this.log(`Already checked in. Current streak: ${visitResult.streak}`.yellow);
                        }
                    }

                    const rouletteResult = await this.spinRoulette(access_token);
                    if (rouletteResult) {
                        if (rouletteResult.rating_award > 0) {
                            this.log(`Spin successful, received ${rouletteResult.rating_award} stars`.green);
                        } else if (rouletteResult.detail) {
                            this.log(`Spin failed, invite ${rouletteResult.detail.need_invites} more friends or try tomorrow`.yellow);
                        } else {
                            this.log(`Undefined spin result`.red);
                        }
                    }

                    const holdCoinsResult = await this.holdCoins(access_token);

                    const tasks = await this.getDailyTasks(access_token);
                    if (tasks) {
                        for (const task of tasks) {
                            await this.completeTask(access_token, task);
                            await this.sleep(1000);
                        }
                    }

                } else {
                    this.log(`Failed to retrieve account data ${i + 1}`);
                }

                if (i < data.length - 1) {
                    await this.waitWithCountdown(3);
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
