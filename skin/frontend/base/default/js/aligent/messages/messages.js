if(typeof Aligent === 'undefined') {
    Aligent = {};
}

/* /////////////////////////////
 //// Event Manager
 /////////////////////////////// */

if(typeof Aligent.EventManager === 'undefined') {
    Aligent.EventManager = Class.create({

        listen: function (event, callback, el) {
            if (this._events[event]) {
                this._events[event].push({callback: callback, el: el});
            } else {
                this._events[event] = [{callback: callback, el: el}];
            }
            return this;
        },

        stopListening: function (event, callback) {
            if (!this._events[event]) return false;
            if (typeof callback == 'undefined') {
                this._events[event] = null;
            } else {
                var i = 0, index = -1;
                for (var item in this._events[event]) {
                    if (this._events[event].callback == callback) {
                        index = i;
                    }
                    i++;
                }

                if (index != -1) {
                    this._events[event].splice(index, 1);
                }
            }
            return this;
        },

        dispatch: function (event, memo) {
            var i = 0, that = this;

            if (!this._events[event]) return false;

            for (i; i < this._events[event].length; i++) {
                this._events[event][i].callback.apply(that._events[event][i].el, [that, memo]);
            }

            return this;
        }
    });
}

/* /////////////////////////////
 //// Notice Manager
 /////////////////////////////// */

/* Handles notice queuing */

if(typeof Aligent.NoticeManager === 'undefined') {
    Aligent.NoticeManager = Class.create({

        initialize: function (el) {
            this._el = el;
            this._messages = [];
            this._currentMessage = null;
            this._completedMessages = [];
            this._isRunning = false;
        },

        add: function (notice) {
            if (Object.prototype.toString.call(notice) === '[object Array]') {
                for (var i in notice) {
                    if (notice.hasOwnProperty(i)) {
                        this.add(notice[i]);
                    }
                }

                return;
            }

            this._messages.push(notice);

            if (!this._isRunning) {
                this.run();
            }
        },

        run: function () {
            if (this._isRunning) return;
            this._isRunning = true;
            this._startMessage();
        },

        _startMessage: function () {
            if (!this._messages.length) {
                this._isRunning = false;
                this._el.setStyle({display: 'none'});
                return;
            }

            this._el.setStyle({display: 'block'});

            this._currentMessage = this._messages.shift();
            this._currentMessage.listen(Aligent.Notice.FINISHED, this._messageComplete.bind(this));
            this._currentMessage.show.bind(this._currentMessage).delay(0.01);
        },

        _messageComplete: function () {
            this._completedMessages.push(this._currentMessage);
            this._currentMessage = null;
            this._startMessage();
        }

    });
}

/* /////////////////////////////
 //// Notice
 /////////////////////////////// */

/* A single notice, can be run manually or added into the notice manager to be queued */

if(typeof Aligent.Notice === 'undefined') {
    Aligent.Notice = Class.create(Aligent.EventManager, {
        initialize: function (el, message, length, animationDelay, classes, id) {
            this._events = {};

            if (typeof(length) == 'undefined') length = 3000;
            if (typeof(animationDelay) == 'undefined') animationDelay = 0;
            if (animationDelay && !length) {
                length = 3000;
            }

            this._el = el;
            this._message = message;
            this._length = length;
            this._animationDelay = animationDelay;
            this._classes = Object.prototype.toString.call(classes) === '[object Array]' ? classes : [];
            this._id = id || this._getRandomInt(1, 1000000000);

            this._el.writeAttribute('id', this._id);

            this._hasRun = false;

            this.delayTimer = null;
            this.animationDelayTimer = null;
        },

        _getRandomInt: function (min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        getAnimationDelay: function () {
            return this._animationDelay;
        },

        getLength: function () {
            return this._length;
        },

        getMessage: function () {
            return this._message;
        },

        getHasRun: function () {
            return this._hasRun;
        },

        onClose: function () {
            clearTimeout(this.animationDelayTimer);
            clearTimeout(this.delayTimer);

            this.animationDelayTimer = null;
            this.delayTimer = null;

            if (this._animationDelay) {
                this._wait2();
            } else {
                this._complete();
            }
        },

        show: function () {
            var _this = this;

            this._el.update(this._message);

            this._el.select('.close').invoke('observe', 'click', this.onClose.bind(this));

            this._classes.each(function (className) {
                _this._el.addClassName(className);
            });

            this._el.addClassName('active');

            if (this._animationDelay) {
                this._wait();
            } else {
                this._delay();
            }

            this.dispatch(Aligent.Notice.STARTED);
        },

        _wait: function () {
            clearTimeout(this.animationDelayTimer);
            this.animationDelayTimer = null;
            this.animationDelayTimer = this._delay.bind(this).delay(this._animationDelay / 1000);
        },

        _delay: function () {
            this.dispatch(Aligent.Notice.DISPLAYED);

            if (this._length === 0) {
                return;
            }

            clearTimeout(this.delayTimer);
            this.delayTimer = null;

            if (this._animationDelay) {
                this.delayTimer = this._wait2.bind(this).delay(this._length / 1000);
            } else {
                this.delayTimer = this._complete.bind(this).delay(this._length / 1000);
            }
        },

        _wait2: function () {
            this._el.removeClassName('active');

            clearTimeout(this.animationDelayTimer);
            this.animationDelayTimer = null;

            this.animationDelayTimer = this._complete.bind(this).delay(this._animationDelay / 1000);
        },

        _complete: function () {
            var _this = this;
            this._el.update('');
            this._hasRun = true;
            this._el.removeClassName('active');
            this._classes.each(function (className) {
                _this._el.removeClassName(className);
            });
            this.dispatch(Aligent.Notice.FINISHED);
        }

    });

    Aligent.Notice.STARTED = 'popupNoticeStarted';
    Aligent.Notice.FINISHED = 'popupNoticeFinished';
    Aligent.Notice.DISPLAYED = 'popupNoticeDisplayed';
}

/* /////////////////////////////
 //// Messages
 /////////////////////////////// */

/* Displays magento messages via the notice manager */

if(typeof Aligent.Messages === 'undefined') {
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
}

Aligent.Messages.EVENTS = 'aligentMessagesEvents';