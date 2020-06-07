const axios = require('axios');

module.exports = {
    unMuteRequest: function (id) {
        axios({
            method: 'get',
            // https://github.com/Mr-Titos/Data-Center-API
            url: 'http://localhost:4242',
            headers: {
                'method': 'unMute',
                'file': 'muteList.json'
            },
            params: {
                idUser: id
            }
        })
    },

    mute: function (idUser, time, guildId, reasonMute) {
        axios({
            method: 'post',
            //https://github.com/Mr-Titos/Data-Center-API
            url: 'http://localhost:4242',
            headers: {
                'method': 'mute',
                'file': 'muteList.json'
            },
            data: {
                id: idUser,
                timeFinished: time,
                guild: guildId,
                reason: reasonMute,
            }
        });
    },

    getMuteList: function () {
        return new Promise(resolve => {
            axios({
                method: 'get',
                // https://github.com/Mr-Titos/Data-Center-API
                url: 'http://localhost:4242',
                headers: {
                    'method': 'all',
                    'file': 'muteList.json'
                }
            }).then(response => {
                resolve(response);
            });
        });
    }
}