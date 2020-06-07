const axios = require('axios');

module.exports = {
    unJail: function (id) {
        axios({
            method: 'get',
            // https://github.com/Mr-Titos/Data-Center-API
            url: 'http://localhost:4242',
            headers: {
                'method': 'unJail',
                'file': 'jailList.json'
            },
            params: {
                idUser: id
            }
        })
    },

    jail: function (idUser, roles, guildId) {
        axios({
            method: 'post',
            //https://github.com/Mr-Titos/Data-Center-API
            url: 'http://localhost:4242',
            headers: {
                'method': 'jail',
                'file': 'jailList.json'
            },
            data: {
                id: idUser,
                rolesId: Array.from(roles),
                guild: guildId,
            }
        });
    },

    getJailList: function () {
        return new Promise(resolve => {
            axios({
                method: 'get',
                // https://github.com/Mr-Titos/Data-Center-API
                url: 'http://localhost:4242',
                headers: {
                    'method': 'all',
                    'file': 'jailList.json'
                }
            }).then(response => {
                resolve(response);
            });
        });
    }
}