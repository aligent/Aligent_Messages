/* /////////////////////////////
 //// Messages
 /////////////////////////////// */

/* Displays magento messages via the notice manager */

Aligent.Messages = Class.create(Aligent.EventManager, {

    initialize: function(config) {
        this._events = {};

        if (typeof(Aligent.NoticeManager) == 'undefined') {
            if (typeof(console) !== 'undefined' && typeof(console.error) !== 'undefined') {
                console.error('Javascript message handing requires the Aligent Notice Manager class to render messages.')
            }
            return false;
        }

        this.delay = config.delay || 5000;
        this.cssAnimationDelay = config.cssAnimationDelay || 500;
        this.cookieName = config.cookieName || 'mage_msgs';
        this.frontendCookieName = config.frontendCookieName || 'frontend_msgs';
        this.sortOrder = config.sortOrder || [];
        this.manualClose = config.manualClose || [];
        this.noticeSelector = config.noticeSelector || '.notice';
        this.noticeContainerSelector = config.noticeContainerSelector || '.notice-container';

        var backendData = Mage.Cookies.get(this.cookieName),
            frontendData = Mage.Cookies.get(this.frontendCookieName);

        if (backendData) {
            this.backendData = JSON.parse(backendData);
        } else {
            this.backendData = {};
        }

        if (frontendData) {
            this.frontendData = JSON.parse(frontendData);
        } else {
            this.frontendData = {};
        }

        this.notices = [];
    },

    addBackendData: function() {
        var notice, i, message, messages;

        if (!this.backendData) return;

        if (typeof(this.backendData.events) !== 'undefined' && this.backendData.events.length) {
            this.dispatch(Aligent.Messages.EVENTS, this.backendData.events);
        }

        messages = this.backendData.messages;

        // Parse backend messages
        for (i in messages) {
            if (messages.hasOwnProperty(i)) {
                message = messages[i];
                if (typeof(this.frontendData[message.type]) == 'undefined') {
                    this.frontendData[message.type] = [];
                }

                notice = message;
                notice.id = this.getRandomInt(1, 100000000);
                this.frontendData[message.type].push(notice);
            }
        }
    },

    getRandomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    getFrontendMessageTotal: function() {
        var count = 0;

        for (var i in this.frontendData) {
            if (this.frontendData.hasOwnProperty(i)) {
                for (var j in this.frontendData[i]) {
                    if (this.frontendData[i].hasOwnProperty(j)) {
                        count ++;
                    }
                }
            }
        }

        return count;
    },

    appendNewMessages: function() {
        var backendData = Mage.Cookies.get(this.cookieName),
            frontendData = Mage.Cookies.get(this.frontendCookieName);

        if (backendData) {
            this.backendData = JSON.parse(backendData);
        } else {
            this.backendData = {};
        }

        if (frontendData) {
            this.frontendData = JSON.parse(frontendData);
        } else {
            this.frontendData = {};
        }
    },

    process: function() {
        this.appendNewMessages();
        this.addBackendData();

        var cookie = JSON.stringify(this.frontendData);
        Mage.Cookies.set(this.frontendCookieName, cookie);
        Mage.Cookies.set(this.cookieName, JSON.stringify([]));
        Mage.Cookies.clear(this.cookieName);

        var data = {
            messages: this.frontendData,
            total: this.getFrontendMessageTotal()
        };

        this.render(data);
    },

    sort: function(a, b) {
        var index1 = this.sortOrder.indexOf(a),
            index2 = this.sortOrder.indexOf(b);

        if (index1 === -1) {
            index1 = this.sortOrder.length;
        }

        if (index2 === -1) {
            index2 = this.sortOrder.length;
        }

        return index1 - index2;
    },

    render: function(data) {
        var message = '', type, notice, delay, noticeObj, count = 1;

        if (typeof(Aligent.noticeManager) === 'undefined') {
            Aligent.noticeManager = new Aligent.NoticeManager($$(this.noticeContainerSelector).first());
        }

        for (type in data.messages) {
            for (notice in data.messages[type]) {
                if (data.messages[type].hasOwnProperty(notice)) {
                    message = '<span class="message">' + data.messages[type][notice].message + '</span>';
                    message += '<span class="close">Close</span>';
                    message += '<span class="totals"><span class="current">' + count+ '</span><span class="total">' + data.total + '</span></span>';

                    if (this.manualClose.indexOf(type) !== -1) {
                        delay = 0;
                    } else {
                        delay = this.delay;
                    }

                    var messageType = data.messages[type][notice].type ? data.messages[type][notice].type : type;


                    noticeObj = new Aligent.Notice(
                        $$(this.noticeSelector).first(),
                        decodeURIComponent(message.replace(/\+/g, ' ')),
                        delay,
                        this.cssAnimationDelay,
                        [ 'message-' + messageType, 'count-' + data.total ],
                        data.messages[type][notice].id
                    );

                    noticeObj.listen(Aligent.Notice.DISPLAYED, this._noticeComplete.bind(this));

                    this.notices.push(noticeObj);

                    count ++;
                }
            }
        }

        this.notices.sort(this.sort.bind(this));
        Aligent.noticeManager.add(this.notices);
        this.notices = [];
    },

    _noticeComplete: function(notice) {
        this._removeNoticeFromCookie(notice);
    },

    _removeNoticeFromCookie: function(notice) {
        var cookie = JSON.parse(Mage.Cookies.get(this.frontendCookieName)),
            type, n;

        for (type in cookie) {
            for (n in cookie[type]) {
                if (cookie[type][n].id === notice._id) {
                    cookie[type].splice(cookie[type].indexOf(cookie[type][n]), 1);
                }
            }
        }

        cookie = JSON.stringify(cookie);
        Mage.Cookies.set(this.frontendCookieName, cookie);
    }

});

Aligent.Messages.EVENTS = 'aligentMessagesEvents';
