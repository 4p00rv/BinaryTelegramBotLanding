(function () {
    var socket = null;
    var user_initiated = false;
    var app_id = 7866;
    var bot_name = "binary_test_bot";
    $(document).ready(function () {
        var tokens = (location.search.match(/token\d=([\w-]+)/g) || []).map(function (val) { return val.split("=")[1]; });
        var accts = (location.search.match(/acct\d=([\w-]+)/g) || []).map(function (val) { return val.split("=")[1]; });
        var auth_obj = [];
        for (var i = 0; i < accts.length; i++) {
            auth_obj.push({
                id: accts[i],
                token: tokens[i]
            });
        }
        if (auth_obj.length)
            localStorage.setItem("oauth", JSON.stringify(auth_obj));
        var oauth = (JSON.parse(localStorage.getItem("oauth")) || []);
        if (oauth.length) {
            hideOnLogin();
            showOnLogin();
            socket = connect();
        } else {
            $('.login').click(function () {
                window.location.assign("https://oauth.binary.com/oauth2/authorize?app_id=" + app_id);
            });
        }

    });

    function hideOnLogin() {
        $('.hide-on-login').hide();
    }

    function showOnLogin() {
        $('.show-on-login').css("display", "block");
    }

    function showOnLogout() {
        $('.hide-on-login').show();
    }

    function hideOnLogout() {
        $('.show-on-login').hide();
    }

    function connect() {
        var ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?l=en&app_id=" + app_id);
        ws.addEventListener("open", authorize);
        ws.addEventListener("close", onclose);
        ws.addEventListener("message", onmsg);
        return ws;
    }

    function authorize() {
        var token = JSON.parse(localStorage.getItem("oauth"))[0].token;
        var request = { authorize: token };
        socket.send(JSON.stringify(request));
    }

    function onclose() {
        if (user_initiated) {
            user_initiated = false;
            return;
        }
        socket = connect();
    }

    function onmsg(event) {
        var response = JSON.parse(event.data);
        var function_map = {
            authorize: function (response) {
                var authorize = response.authorize;
                $(".loginid").text(authorize.loginid);
                populateLoginIds();
                socket.send(JSON.stringify({ api_token: 1 }));
            },
            logout: onLogout,
            api_token: onAPIToken,
            handleErrors: onError
        }
        if (!response.error) {
            function_map[response.msg_type](response);
        } else {
            function_map["handleErrors"](response.error);
        }
    }

    function populateLoginIds() {
        $('.account').remove(); // Clear any previous loginids        
        var oauth = JSON.parse(localStorage.getItem("oauth"));
        oauth.forEach(function (e, i) {
            if (i == 0) return;
            $("ul.loginids li:first").after("<li class='account'><span>" + e.id + "</span></li>");
        });
        $(".account").click(function (e) {
            switchAccount(e.target);
        });
        $(".logout").click(function () {
            socket.send(JSON.stringify({ "logout": 1 }));
        });
    }

    function switchAccount(ele) {
        var id = $(ele).text();
        var oauth = JSON.parse(localStorage.getItem("oauth"));
        oauth.forEach(function (e, i) {
            if (e.id === id) {
                var current_token = oauth.splice(i, 1)[0];
                oauth.unshift(current_token);
                localStorage.setItem("oauth", JSON.stringify(oauth));
                authorize();
            }
        });
    }

    function onLogout() {
        user_initiated = true;
        hideOnLogout();
        showOnLogout();
        socket.close();
        localStorage.removeItem("oauth");
        $('.login').off('click').click(function () {
            window.location.assign("https://oauth.binary.com/oauth2/authorize?app_id=" + app_id);
        });
    }

    function onError(error) {
        console.error(error);
    }

    function onAPIToken(response) {
        var tokens = (response.api_token.tokens || []);
        $(".loading").hide();
        $(".loading-tokens").hide();
        $(".api-token").show();
        $(".create-form").hide();
        $(".create").show();       
        $(".empty").hide();       
        $(".tokens").hide();  
        $(".tokens .token").remove();
        $(".api-token .create > span").off("click").click(function () {
            $(".empty").hide();
            $(".tokens").hide();
            $(".create").hide();
            $(".create-form").show();
        });
        $(".api-token .create-form .cancel").off("click").click(function () {
            $(".create-form").hide();
            $(".loading-tokens").show();
            socket.send(JSON.stringify({ api_token: 1 }));
        });
        $(".api-token .create-form .ok").off("click").click(function () {
            var scopes = [];
            if ($("#read").is(":checked")) scopes.push("read");
            if ($("#trade").is(":checked")) scopes.push("trade");
            if ($("#payments").is(":checked")) scopes.push("payments");
            if ($("#admin").is(":checked")) scopes.push("admin");
            var name = $("#name").val();
            var request = {
                api_token: 1,
                new_token: name,
                new_token_scopes: scopes
            }
            socket.send(JSON.stringify(request));
        });
        if (!tokens.length) {
            $(".empty").show();
        } else {
            tokens.forEach(function (e) {
                var outer = $("<div class='token'></div>");
                outer.append("<span class='name'>" + e.display_name + "</span>");
                outer.append("<span class='scopes'>" + e.scopes.map(function (scope) {
                    return scope.replace(/\b[a-z]/g, function (letter) {
                        return letter.toUpperCase();
                    });
                }).join(", ") + "</span>");
                var telegram_link = $("<span class='telegram_link'>Link</span>");
                telegram_link.click(function () {
                    window.location.assign("https://t.me/" + bot_name + "?start=" + e.token);
                });
                outer.append(telegram_link);
                $(".tokens").append(outer);
            });
            $(".tokens").show();
        }
    }

})();
