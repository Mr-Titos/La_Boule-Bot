require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client({
    autoReconnect: true,
    fetchAllMembers: true,
});
const MuteRequest = require('./muteRequest.js');
const JailRequest = require('./jailRequest.js');
const token = process.env.DISCORD_TOKEN;

const prefix = '*';
const muteRoleName = 'Muted.';
let jailRoleName = 'Jailed.';

const msgHelp = "``` 3 commandes sont disponibles \n- " + prefix + "add <nom channel> \n- " + prefix + "add <nom channel> <nb de points> (Peut ajouté des points négatifs) \n- " + prefix + "remove <nom channel>" + " ```";
const msgErrorCommande = "La commande n'a pas été reconnue";

bot.on('ready', function () {
    console.log("Start 2 Config...");
    bot.guilds.cache.forEach(guild => {
        checkMutedRole(guild);
    });
    setInterval(checkTempMute, 60000); // 60 000 ms = 1 sec
    console.log("La Boule ready");
})

bot.on('message', msg => {
    if (msg.guild === null || msg.author.bot) {
        return;
    }
    let member = msg.member;
    if (member === undefined || member === null) {
        console.log("member null " + msg.author.username + '\n' + msg.guild.me.hasPermission(msg.channel));
        console.log(msg.guild.members.cache.find(m => m.user.id === msg.author.id));
    }
    if (!member.hasPermission("MUTE_MEMBERS"))
        return;
    processMsg(msg.content).then(parsedMsg => {

        var memberFocused = msg.mentions.members.first();
        checkMutedRole(msg.guild);
        const mutedRole = getMutedRole(msg.guild);
        const jailRole = getJailRole(msg.guild);
        switch (parsedMsg[0].toLowerCase()) {
            case 'tempmute':
                // parsedMsg[0] = command parsedMsg[1] = member parsedMsg[2] = time [parsedMsg[3],parsedMsg[n]] = reason
                if (checkIfAlreadyMuted(msg, memberFocused, mutedRole)) {
                    return;
                }
                if (!parsedMsg[2]) {
                    msg.channel.send("Please give the time\n_m = minutes, h = hours, d = days_");
                    return;
                }
                getTimeMute(parsedMsg[2])
                    .then(([time, timeMinute]) => {
                        const reason = parsedMsg.slice(3, parsedMsg.length).toString().replace(/,/g, ' ');
                        MuteRequest.mute(memberFocused.id, time, msg.guild.id, reason);
                        memberFocused.roles.add(mutedRole).then(muteReply(msg, memberFocused, reason, timeMinute + ' minutes', memberFocused.user.username + '#' + memberFocused.user.discriminator + ' has been muted'));

                    })
                    .catch(error => msg.channel.send(error));
                break;
            case 'mute':
                // parsedMsg[0] = command parsedMsg[1] = member parsedMsg[2] = reason
                if (checkIfAlreadyMuted(msg, memberFocused, mutedRole)) {
                    return;
                }
                const reason = parsedMsg.slice(2, parsedMsg.length).toString().replace(/,/g, ' ');
                MuteRequest.mute(memberFocused.id, 0, msg.guild.id, reason);
                memberFocused.roles.add(mutedRole).then(muteReply(msg, memberFocused, reason, 'indefinitely', memberFocused.user.username + '#' + memberFocused.user.discriminator + ' has been muted'));
                break;
            case 'unmute':
                // parsedMsg[0] = command parsedMsg[1] = member
                unMute(msg, memberFocused, mutedRole, memberFocused.guild.id);
                break;
            case 'jail':
                // parsedMsg[0] = command parsedMsg[1] = member [parsedMsg[2],parsedMsg[n]] = reason
                if (checkJailRole(msg.guild)) {
                    msg.channel.send("The jail role isnt assigned.");
                    return;
                }
                if (memberFocused.roles.cache.find(r => r.id === jailRole.id) !== undefined) {
                    msg.channel.send("The user <@" + memberFocused.user.id + "> is already jailed");
                    return;
                }

                jail(msg, memberFocused).then(() => {
                    memberFocused.roles.add(jailRole);
                    jailReply(msg, memberFocused, memberFocused.user.username + '#' + memberFocused.user.discriminator + " has been jailed");
                });
                break;
            case 'unjail':
                // parsedMsg[0] = command parsedMsg[1] = member
                if (memberFocused.roles.cache.find(r => r.id === jailRole.id) === undefined) {
                    msg.channel.send("The user <@" + memberFocused.user.id + "> isn't jailed");
                    return;
                }
                JailRequest.getJailList().then(response => {
                    let rolesList = Array.from(response.data.jailList).find(jailed => jailed.id === memberFocused.user.id && jailed.guild === msg.guild.id).rolesId;
                    rolesList.every(roleId => memberFocused.roles.add(msg.guild.roles.cache.find(r => r.id === roleId)));
                    JailRequest.unJail(memberFocused.user.id);
                    memberFocused.roles.remove(jailRole);
                    jailReply(msg, memberFocused, memberFocused.user.username + '#' + memberFocused.user.discriminator + " has been released");
                });
                break;
            case 'setjail':
                // parsedMsg[0] = command parsedMsg[1] = role name
                jailRoleName = msg.mentions.roles.first().id;
                if (checkJailRole(msg.guild)) {
                    msg.channel.send("The role" + jailRoleName + " doesn't exist");
                    return;
                }
                msg.channel.send("The jail role is assigned to <@&" + getJailRole(msg.guild).id + ">");
                break;
            case 'help':
                msg.channel.send(msgHelp);
                break;
            default:
                msg.channel.send(msgErrorCommande);
                break;
        }
    });
});

bot.login(token);

function processMsg(rawMsg) {
    return new Promise(function (resolve, reject) {
        if (rawMsg.substring(0, 1) === prefix)
            resolve(rawMsg.substring(1).split(' '));
    });
}

function muteReply(msg, memberFocused, reason, time, title) {
    let embed = {
        "url": "https://discordapp.com",
        "color": 10197915,
        "thumbnail": {
            "url": bot.user.avatarURL()
        },
        "author": {
            "name": title,
            "icon_url": memberFocused.user.avatarURL()
        },
        "fields": [{
                "name": "Reason",
                "value": reason ? reason : "undefined"
            },
            {
                "name": "Remaining Time",
                "value": time
            }
        ]
    };
    msg.channel.send({
        embed
    });
}

function checkIfAlreadyMuted(msg, memberFocused, mutedRole) {
    if (memberFocused.roles.cache.find(r => r.id === mutedRole.id)) {
        getMutedMember(memberFocused.user.id).then(mutedMember => {
            let timeToUnmute = getTimeUntilUnmute(mutedMember);
            muteReply(msg, memberFocused, mutedMember.reason, timeToUnmute !== 0 ? timeToUnmute + " minutes" : "indefinitely", memberFocused.user.username + '#' + memberFocused.user.discriminator + " has already been muted");
        });
        return true;
    }
    return false;
}

function getTimeUntilUnmute(mutedMember) {
    if (mutedMember.timeFinished === 0) {
        return 0;
    }
    return parseInt((mutedMember.timeFinished - Math.floor(Date.now() / 1000)) / 60);
}

function getMutedMember(idUser) {
    return new Promise(resolve => {
        MuteRequest.getMuteList().then(response => {
            Array.from(response.data.muteList).forEach(mutedMember => {
                if (mutedMember.id === idUser)
                    resolve(mutedMember);
            });
        })
    });
}

function checkTempMute() {
    MuteRequest.getMuteList().then(response => {
        Array.from(response.data.muteList).filter(mutedMember => mutedMember.timeFinished !== 0).forEach(mutedMember => {
            if (Math.floor(Date.now() / 1000) > mutedMember.timeFinished) {
                let guild = bot.guilds.cache.find(g => g.id === mutedMember.guild);
                let member = guild.members.cache.array().find(m => m.user.id === mutedMember.id);
                unMute(null, member, getMutedRole(guild), guild.id);
            }
        });
    })
}

function getTimeMute(rawTime) {
    return new Promise((resolve, reject) => {
        let time = "";
        let iterator = "";
        Array.from(rawTime).forEach(char => {
            if (parseInt(char) || char === '0')
                time += char;
            else
                iterator = char;
        });
        if (iterator.length > 1)
            reject("There is an error with the time given");

        switch (iterator) {
            case 'm':
                resolve([Math.floor(Date.now() / 1000) + (parseInt(time) * 60), parseInt(time)]);
            case 'h':
                resolve([Math.floor(Date.now() / 1000) + (parseInt(time) * 60 * 60), parseInt(time) * 60]);
            case 'd':
                resolve([Math.floor(Date.now() / 1000) + (parseInt(time) * 60 * 60 * 24), parseInt(time) * 60 * 24]);
            default:
                reject("There is an error with the time given");
        }
    })
}

function unMute(msg, member, mutedRole, guildId) {
    if (!member.roles.cache.find(r => r.id === mutedRole.id)) {
        msg.channel.send("The user <@" + member.user.id + "> isn't mute !")
        return;
    }
    member.roles.remove(mutedRole).then(() => {
        if (msg !== null) {
            getMutedMember(member.user.id).then(mutedMember => {
                let timeToUnmute = getTimeUntilUnmute(mutedMember);
                muteReply(msg, member, mutedMember.reason, timeToUnmute !== 0 ? timeToUnmute + " minutes" : "indefinitely", member.user.username + '#' + member.user.discriminator + " has been unmute")
            });
        }
        member.user.send("You have been unmute on " + bot.guilds.cache.find(g => g.id === guildId).name);

        MuteRequest.unMuteRequest(member.user.id);
    });
}

function getMutedRole(guild) {
    return guild.roles.cache.find(r => r.name === muteRoleName);
}

function checkMutedRole(guild) {
    if (getMutedRole(guild) === undefined) {
        guild.roles.create({
                data: {
                    name: muteRoleName,
                    color: 'GRAY',
                },
            })
            .then(role => {
                role.setPermissions(0).then(console.log("Role muted created on server : " + guild.name));
                console.log("Role Muted created on server " + guild.name);
            })
            .catch(console.error);
    }
}

function jailReply(msg, member, title) {
    const embed = {
        "url": "https://discordapp.com",
        "color": 10197915,
        "image": {
            "url": "https://www.titos.dev/download/La_Boule.gif"
        },
        "author": {
            "name": title,
            "icon_url": member.user.avatarURL()
        }
    };
    msg.channel.send({
        embed
    });
}

function getJailRole(guild) {
    return guild.roles.cache.find(r => r.id === jailRoleName);
}

async function jail(msg, memberFocused) {
    return new Promise(async function (resolve) {
        let rolesId = new Array();
        await memberFocused.roles.cache.every(role => role.id === msg.guild.roles.everyone.id ? null : rolesId.push(role.id));
        await memberFocused.roles.remove(memberFocused.roles.cache);
        resolve(JailRequest.jail(memberFocused.user.id, rolesId, msg.guild.id));
    });
}

function checkJailRole(guild) {
    return getJailRole(guild) === undefined;
}