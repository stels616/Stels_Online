(function() {
  'use strict';

  var Defined = {
    api: 'lampac',
    localhost: 'http://lampaua.mooo.com/',
    apn: ''
  };

  var balansers_with_search;
  
  var unic_id = Lampa.Storage.get('lampac_unic_id', '');
  if (!unic_id) {
    unic_id = Lampa.Utils.uid(8).toLowerCase();
    Lampa.Storage.set('lampac_unic_id', unic_id);
  }
  
    function getAndroidVersion() {
  if (Lampa.Platform.is('android')) {
    try {
      var current = AndroidJS.appVersion().split('-');
      return parseInt(current.pop());
    } catch (e) {
      return 0;
    }
  } else {
    return 0;
  }
}

var hostkey = 'http://lampaua.mooo.com'.replace('http://', '').replace('https://', '');

if (!window.rch_nws || !window.rch_nws[hostkey]) {
  if (!window.rch_nws) window.rch_nws = {};

  window.rch_nws[hostkey] = {
    type: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : undefined,
    startTypeInvoke: false,
    rchRegistry: false,
    apkVersion: getAndroidVersion()
  };
}

window.rch_nws[hostkey].typeInvoke = function rchtypeInvoke(host, call) {
  if (!window.rch_nws[hostkey].startTypeInvoke) {
    window.rch_nws[hostkey].startTypeInvoke = true;

    var check = function check(good) {
      window.rch_nws[hostkey].type = Lampa.Platform.is('android') ? 'apk' : good ? 'cors' : 'web';
      call();
    };

    if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) check(true);
    else {
      var net = new Lampa.Reguest();
      net.silent('http://lampaua.mooo.com'.indexOf(location.host) >= 0 ? 'https://github.com/' : host + '/cors/check', function() {
        check(true);
      }, function() {
        check(false);
      }, false, {
        dataType: 'text'
      });
    }
  } else call();
};

window.rch_nws[hostkey].Registry = function RchRegistry(client, startConnection) {
  window.rch_nws[hostkey].typeInvoke('http://lampaua.mooo.com', function() {

    client.invoke("RchRegistry", {
      host: location.host,
      rchtype: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : (window.rch_nws[hostkey].type || 'web'),
      apkVersion: Lampa.Platform.is('android') ? (window.rch_nws[hostkey].apkVersion || 0) : 0,
      player: Lampa.Storage.field('player')
    });

    if (window.rch_nws[hostkey].rchRegistry)
      return;

    window.rch_nws[hostkey].rchRegistry = true;

    var handled = false;
    client.on('RchRegistry', function (clientIp, connectionId, rchtype) {
      if (startConnection && !handled) {
	    handled = true;
	    startConnection();
      }
    });

    client.on("RchClient", function(rchId, url, data, headers, returnHeaders) {
      var network = new Lampa.Reguest();
	  
	  function sendResult(uri, html) {
	    $.ajax({
	      url: 'http://lampaua.mooo.com/rch/' + uri + '?id=' + rchId,
	      type: 'POST',
	      data: html,
	      async: true,
	      cache: false,
	      contentType: false,
	      processData: false,
	      success: function(j) {},
	      error: function() {
	        client.invoke("RchResult", rchId, '');
	      }
	    });
	  }

      function result(html) {
        if (Lampa.Arrays.isObject(html) || Lampa.Arrays.isArray(html)) {
          html = JSON.stringify(html);
        }

        if (typeof CompressionStream !== 'undefined' && html && html.length > 1000) {
          var compressionStream = new CompressionStream('gzip');
          var encoder = new TextEncoder();
          var readable = new ReadableStream({
            start: function(controller) {
              controller.enqueue(encoder.encode(html));
              controller.close();
            }
          });
          var compressedStream = readable.pipeThrough(compressionStream);
          new Response(compressedStream).arrayBuffer()
            .then(function(compressedBuffer) {
              var compressedArray = new Uint8Array(compressedBuffer);
              if (compressedArray.length > html.length) {
                sendResult('result', html);
              } else {
                sendResult('gzresult', compressedArray);
              }
            })
            .catch(function() {
              sendResult('result', html);
            });

        } else {
          sendResult('result', html);
        }
      }

      if (url == 'eval') {
        console.log('RCH', url, data);
        result(eval(data));
      } else if (url == 'evalrun') {
        console.log('RCH', url, data);
        eval(data);
      } else if (url == 'ping') {
        result('pong');
      } else {
        console.log('RCH', url);
        network["native"](url, result, function(e) {
          console.log('RCH', 'result empty, ' + e.status);
          result('');
        }, data, {
          dataType: 'text',
          timeout: 1000 * 8,
          headers: headers,
          returnHeaders: returnHeaders
        });
      }
    });

    client.on('Connected', function(connectionId) {
      console.log('RCH', 'ConnectionId: ' + connectionId);
      window.rch_nws[hostkey].connectionId = connectionId;
    });
    client.on('Closed', function() {
      console.log('RCH', 'Connection closed');
    });
    client.on('Error', function(err) {
      console.log('RCH', 'error:', err);
    });
  });
};

  window.rch_nws[hostkey].typeInvoke('http://lampaua.mooo.com', function() {});

  function rchInvoke(json, call) {
    if (!window.nwsClient) 
      window.nwsClient = {};

    var client = window.nwsClient[hostkey];
    if (client && client.connectionId != null) {
      call();
    }
    else if (client) {
      console.log('RCH', 'Reconnecting...');
      client.reconnect(function() {
        call();
      });
    }
    else {
      window.nwsClient[hostkey] = new NativeWsClient(json.nws, {
        autoReconnect: true
      });

      window.nwsClient[hostkey].on('Connected', function(connectionId) {
        window.rch_nws[hostkey].Registry(window.nwsClient[hostkey], function() {
          call();
        });
      });

      window.nwsClient[hostkey].connect();
    }
  }

  function rchRun(json, call) {
    if (typeof NativeWsClient == 'undefined') {
      Lampa.Utils.putScript(["http://lampaua.mooo.com/js/nws-client-es5.js?v21042026"], function() {}, false, function() {
        rchInvoke(json, call);
      }, true);
    } else {
      rchInvoke(json, call);
    }
  }

  function account(url) {
    url = url + '';
    var token = '';
    if (url.indexOf('account_email=') == -1) {
      var email = Lampa.Storage.get('account_email');
      if (!email && /^\d{6,}$/.test(token)) {
        email = token;
        try { Lampa.Storage.set('account_email', email); } catch (e) {}
      }
      if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
    }
    if (url.indexOf('uid=') == -1) {
      var uid = Lampa.Storage.get('lampac_unic_id', '');
      if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
    }
    if (url.indexOf('token=') == -1) {
      if (token != '') url = Lampa.Utils.addUrlComponent(url, 'token=');
    }
    if (url.indexOf('nws_id=') == -1) {
      var nws_id = Lampa.Storage.get('lampac_nws_id', '');
      if (nws_id) url = Lampa.Utils.addUrlComponent(url, 'nws_id=' + encodeURIComponent(nws_id));
    }
    return url;
  }

  function addHeaders() {
    var kit_aesgcmkey = Lampa.Storage.get('kit_aesgcmkey', '');
    if (kit_aesgcmkey) return { 'X-Kit-AesGcm': Lampa.Storage.get('kit_aesgcmkey', '') };
    return {};
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(s) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[s];
    });
  }

  var accessGroupNames = {
    0: '\u0413\u043b\u044f\u0434\u0430\u0447',
    1: '\u0414\u043e\u0431\u0440\u043e\u0434\u0456\u0439',
    2: '\u041c\u0435\u0446\u0435\u043d\u0430\u0442',
    3: '\u041f\u0440\u0435\u043c\u0456\u0443\u043c'
  };

  function accessGroupName(value) {
    if (value == null || value === '') return '-';

    var key = parseInt(value, 10);
    if (!isNaN(key) && accessGroupNames[key]) return accessGroupNames[key];

    return value;
  }

  function accessData(data) {
    if (!data) return null;

    if (typeof data == 'string') {
      data = Lampa.Arrays.decodeJson(data, {});
    }

    return data && data.accsdb ? data : null;
  }

  function accessModal(data, onClose) {
    var controller = Lampa.Controller.enabled().name;
    var info = accessData(data) || {};
    var text = typeof data == 'string' ? data : info.msg;
    var name = (info.user_name || '').trim();
    var user_group = accessGroupName(info.user_group);
    var required_group = accessGroupName(info.required_group);
    var message = text || '\u0446\u0435\u0439 \u0440\u043e\u0437\u0434\u0456\u043b \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0438\u0439 \u043b\u0438\u0448\u0435 \u0434\u043b\u044f \u043a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432 \u0437 \u0432\u0438\u0449\u043e\u044e \u0433\u0440\u0443\u043f\u043e\u044e \u0434\u043e\u0441\u0442\u0443\u043f\u0443.';

    if (name) message = name + ', ' + message.charAt(0).toLowerCase() + message.slice(1);

    var content = "<div class=\"about\">\n<div>"+escapeHtml(message)+"</div>\n<div style=\"margin-top:1em;opacity:.85\">\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0456\u043d\u0448\u0435 \u0434\u0436\u0435\u0440\u0435\u043b\u043e.</div>\n<div class=\"about__contacts\">\n<div>\n<small>\u0412\u0430\u0448\u0430 \u0433\u0440\u0443\u043f\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0443</small><br>\n"+escapeHtml(user_group)+"\n</div>\n\n<div>\n<small>\u041f\u043e\u0442\u0440\u0456\u0431\u043d\u0430 \u0433\u0440\u0443\u043f\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0443</small><br>\n"+escapeHtml(required_group)+"\n</div>\n</div>\n</div>";

    Lampa.Modal.open({
      title: '\u0414\u043e\u0441\u0442\u0443\u043f \u043e\u0431\u043c\u0435\u0436\u0435\u043d\u043e',
      html: $(content),
      size: 'medium',
      onBack: function onBack() {
        Lampa.Modal.close();
        Lampa.Controller.toggle(controller);
        if (onClose) onClose();
      }
    });
  }

  function formatEpisodeNumber(episodeNumber) {
    return (episodeNumber < 10 ? '0' : '') + episodeNumber;
  }
  
  var Network = Lampa.Reguest;

  function component(object) {
    var network = new Network();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true
    });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var sources = {};
    var last;
    var source;
    var balanser;
    var initialized;
    var balanser_timer;
    var images = [];
    var number_of_requests = 0;
    var number_of_requests_timer;
    var life_wait_times = 0;
    var life_wait_timer;
    var filter_sources = {};
    var filter_translate = {
      season: Lampa.Lang.translate('torrent_serial_season'),
      voice: Lampa.Lang.translate('torrent_parser_voice'),
      source: Lampa.Lang.translate('settings_rest_source')
    };
    var filter_find = {
      season: [],
      voice: []
    };
	
    if (balansers_with_search == undefined) {
      network.timeout(10000);
      network.silent(account('http://lampaua.mooo.com/lite/withsearch'), function(json) {
        balansers_with_search = json;
      }, function() {
		  balansers_with_search = [];
	  });
    }
	
    function balanserName(j) {
      var bals = j.balanser;
      var name = j.name.split(' ')[0];
      return (bals || name).toLowerCase();
    }

    // LampUA: premium online source gating start
    var access_user_group = null;

    function firstDefined() {
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== '') return arguments[i];
      }

      return null;
    }

    function accessInt(value) {
      if (value === null || value === undefined || value === '') return null;

      var num = parseInt(value, 10);
      return isNaN(num) ? null : num;
    }

    function urlParam(url, name) {
      url = url || '';

      var match = (url + '').match(new RegExp('[?&]' + name + '=([^&]+)'));
      return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
    }

    function rememberAccessGroup(data) {
      if (!data) return;

      var value = firstDefined(data.user_group, data.userGroup, data.current_group, data.currentGroup, data.user && data.user.group, data.account && data.account.group);
      var group = accessInt(value);

      if (group !== null) access_user_group = group;
    }

    function sourceMeta(j) {
      var denied = accessData(j);
      var groupdeny = (j.url || '').indexOf('/groupdeny') >= 0;
      var required = accessInt(firstDefined(j.required_group, j.requiredGroup, j.group, denied && denied.required_group, denied && denied.group, urlParam(j.url, 'required_group')));
      var user = accessInt(firstDefined(j.user_group, j.userGroup, j.current_group, j.currentGroup, j.user && j.user.group, j.account && j.account.group, denied && denied.user_group, denied && denied.userGroup, access_user_group));
      var locked = !!denied || groupdeny;

      if (!locked && required !== null && user !== null && user < required) locked = true;

      return {
        group: required,
        user_group: user,
        locked: locked,
        access: {
          accsdb: true,
          msg: firstDefined(j.msg, denied && denied.msg, '\u0446\u0435 \u0434\u0436\u0435\u0440\u0435\u043b\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0435 \u043b\u0438\u0448\u0435 \u0434\u043b\u044f \u043a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432 \u0437 \u0432\u0438\u0449\u043e\u044e \u0433\u0440\u0443\u043f\u043e\u044e \u0434\u043e\u0441\u0442\u0443\u043f\u0443.'),
          user_name: firstDefined(j.user_name, denied && denied.user_name, ''),
          user_group: user,
          required_group: required
        }
      };
    }

    function setSource(j) {
      rememberAccessGroup(j);

      var name = balanserName(j);
      var meta = sourceMeta(j);

      if (meta.locked && j.group_hide === true) return;

      sources[name] = {
        url: j.url,
        name: j.name,
        show: typeof j.show == 'undefined' ? true : j.show,
        group: meta.group,
        user_group: meta.user_group,
        locked: meta.locked,
        access: meta.access
      };
    }

    function sortFilterSources(keys) {
      return keys.sort(function(a, b) {
        var al = sources[a] && sources[a].locked ? 1 : 0;
        var bl = sources[b] && sources[b].locked ? 1 : 0;

        return al - bl;
      });
    }

    function rebuildFilterSources() {
      filter_sources = sortFilterSources(Lampa.Arrays.getKeys(sources));
    }

    function sourceTitle(key) {
      var item = sources[key];
      if (!item) return key;

      return item.name + (item.locked ? ' \uD83D\uDD12 ' + accessGroupName(item.group) : '');
    }

    function autoSourceKeys(showOnly) {
      return filter_sources.filter(function(key) {
        var item = sources[key];
        return item && !item.locked && (!showOnly || item.show);
      });
    }

    function firstAutoSource() {
      var keys = autoSourceKeys(true);
      if (keys.length) return keys[0];

      keys = autoSourceKeys(false);
      if (keys.length) return keys[0];

      return filter_sources[0];
    }

    function nextAutoSource(current) {
      var keys = autoSourceKeys(true);
      if (keys.length < 2) return '';

      var indx = keys.indexOf(current);
      var next = keys[indx + 1];
      if (!next) next = keys[0];

      return next;
    }

    function showSourceAccess(key, onClose) {
      var item = sources[key];
      var fallback = item && item.access ? item.access : {
        accsdb: true,
        user_group: access_user_group,
        required_group: item && item.group
      };

      if (item && item.url && item.url.indexOf('/groupdeny') >= 0 && fallback.user_group === null) {
        network.silent(account(item.url), function(data) {
          accessModal(accessData(data) || data || fallback, onClose);
        }, function() {
          accessModal(fallback, onClose);
        }, false, {
          headers: addHeaders()
        });

        return;
      }

      accessModal(fallback, onClose);
    }
    // LampUA: premium online source gating end
	
	function clarificationSearchAdd(value){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
		all[id] = value;
		
		Lampa.Storage.set('clarification_search',all);
	}
	
	function clarificationSearchDelete(){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
		delete all[id];
		
		Lampa.Storage.set('clarification_search',all);
	}
	
	function clarificationSearchGet(){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
		return all[id];
	}
	
    this.initialize = function() {
      var _this = this;
      this.loading(true);
      filter.onSearch = function(value) {
		  
		clarificationSearchAdd(value);
		
        Lampa.Activity.replace({
          search: value,
          clarification: true,
          similar: true
        });
      };
      filter.onBack = function() {
        _this.start();
      };
      filter.render().find('.selector').on('hover:enter', function() {
        clearInterval(balanser_timer);
      });
      filter.render().find('.filter--search').appendTo(filter.render().find('.torrent-filter'));
      filter.onSelect = function(type, a, b) {
        if (type == 'filter') {
          if (a.reset) {
			  clarificationSearchDelete();
			  
            _this.replaceChoice({
              season: 0,
              voice: 0,
              voice_url: '',
              voice_name: ''
            });
            setTimeout(function() {
              Lampa.Select.close();
              Lampa.Activity.replace({
				  clarification: 0,
				  similar: 0
			  });
            }, 10);
          } else {
            var url = filter_find[a.stype][b.index].url;
            var choice = _this.getChoice();
            if (a.stype == 'voice') {
              choice.voice_name = filter_find.voice[b.index].title;
              choice.voice_url = url;
            }
            choice[a.stype] = b.index;
            _this.saveChoice(choice);
            _this.reset();
            _this.request(url);
            setTimeout(Lampa.Select.close, 10);
          }
        } else if (type == 'sort') {
          Lampa.Select.close();
          if (sources[a.source] && sources[a.source].locked) {
            showSourceAccess(a.source);
            return;
          }
          object.lampac_custom_select = a.source;
          _this.changeBalanser(a.source);
        }
      };
      if (filter.addButtonBack) filter.addButtonBack();
      filter.render().find('.filter--sort span').text(Lampa.Lang.translate('lampac_balanser'));
      scroll.body().addClass('torrent-list');
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find('.explorer__files-head'));
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));
      Lampa.Controller.enable('content');
      this.loading(false);
	  if(object.balanser){
		  files.render().find('.filter--search').remove();
		  sources = {};
		  sources[object.balanser] = {name: object.balanser};
		  balanser = object.balanser;
		  filter_sources = [];
		  
		  return network["native"](account(object.url.replace('rjson=','nojson=')), this.parse.bind(this), function(){
			  files.render().find('.torrent-filter').remove();
			  _this.empty();
		  }, false, {
            dataType: 'text',
			headers: addHeaders()
		  });
	  } 
      this.externalids().then(function() {
        return _this.createSource();
      }).then(function(json) {
        if (!balansers_with_search.find(function(b) {
            return balanser.slice(0, b.length) == b;
          })) {
          filter.render().find('.filter--search').addClass('hide');
        }
        _this.search();
      })["catch"](function(e) {
        _this.noConnectToServer(e);
      });
    };
    this.rch = function(json, noreset) {
      var _this2 = this;
	  rchRun(json, function() {
        if (!noreset) _this2.find();
        else noreset();
	  });
    };
    this.externalids = function() {
      return new Promise(function(resolve, reject) {
        if (!object.movie.imdb_id || !object.movie.kinopoisk_id) {
          var query = [];
          query.push('id=' + encodeURIComponent(object.movie.id));
          query.push('serial=' + (object.movie.name ? 1 : 0));
          if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
          if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
          var url = Defined.localhost + 'externalids?' + query.join('&');
          network.timeout(10000);
          network.silent(account(url), function(json) {
            for (var name in json) {
              object.movie[name] = json[name];
            }
            resolve();
          }, function() {
            resolve();
          }, false, {
              headers: addHeaders()
		  });
        } else resolve();
      });
    };
    this.updateBalanser = function(balanser_name) {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
      last_select_balanser[object.movie.id] = balanser_name;
      Lampa.Storage.set('online_last_balanser', last_select_balanser);
    };
    this.changeBalanser = function(balanser_name) {
      if (sources[balanser_name] && sources[balanser_name].locked) {
        showSourceAccess(balanser_name);
        return;
      }

      this.updateBalanser(balanser_name);
      Lampa.Storage.set('online_balanser', balanser_name);
      var to = this.getChoice(balanser_name);
      var from = this.getChoice();
      if (from.voice_name) to.voice_name = from.voice_name;
      this.saveChoice(to, balanser_name);
      Lampa.Activity.replace();
    };
    this.requestParams = function(url) {
      var query = [];
      var card_source = object.movie.source || 'tmdb'; //Lampa.Storage.field('source')
      query.push('id=' + encodeURIComponent(object.movie.id));

      if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
      if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
      if (object.movie.tmdb_id) query.push('tmdb_id=' + (object.movie.tmdb_id || ''));

      if (object.movie.keywords && object.movie.keywords.results) {
         for (var i = 0, a = object.movie.keywords.results; i < a.length; i++) {
            if (a[i].name == 'anime') {
                query.push('anime=1');
                break;
            }
         }
      }

      query.push('title=' + encodeURIComponent(object.clarification ? object.search : object.movie.title || object.movie.name));
      query.push('original_title=' + encodeURIComponent(object.movie.original_title || object.movie.original_name));
      query.push('serial=' + (object.movie.name ? 1 : 0));
      query.push('original_language=' + (object.movie.original_language || ''));
      query.push('year=' + ((object.movie.release_date || object.movie.first_air_date || '0000') + '').slice(0, 4));
      query.push('source=' + card_source);
      query.push('clarification=' + (object.clarification ? 1 : 0));
      query.push('similar=' + (object.similar ? true : false));
      query.push('rchtype=' + (((window.rch_nws && window.rch_nws[hostkey]) ? window.rch_nws[hostkey].type : (window.rch && window.rch[hostkey]) ? window.rch[hostkey].type : '') || ''));
      if (Lampa.Storage.get('account_email', '')) query.push('cub_id=' + Lampa.Utils.hash(Lampa.Storage.get('account_email', '')));
      return url + (url.indexOf('?') >= 0 ? '&' : '?') + query.join('&');
    };
    this.getLastChoiceBalanser = function() {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
      if (last_select_balanser[object.movie.id]) {
        return last_select_balanser[object.movie.id];
      } else {
        return Lampa.Storage.get('online_balanser', filter_sources.length ? filter_sources[0] : '');
      }
    };
    this.startSource = function(json) {
      return new Promise(function(resolve, reject) {
        rememberAccessGroup(json);
        json.forEach(function(j) {
          setSource(j);
        });
        rebuildFilterSources();
        if (filter_sources.length) {
          var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
          if (last_select_balanser[object.movie.id] && sources[last_select_balanser[object.movie.id]] && !sources[last_select_balanser[object.movie.id]].locked) {
            balanser = last_select_balanser[object.movie.id];
          } else {
            balanser = Lampa.Storage.get('online_balanser', filter_sources[0]);
          }
          if (!sources[balanser] || sources[balanser].locked) balanser = firstAutoSource();
          if (!sources[balanser].show && !object.lampac_custom_select) balanser = firstAutoSource();
          source = sources[balanser].url;
          Lampa.Storage.set('active_balanser', balanser);
          resolve(json);
        } else {
          reject();
        }
      });
    };
    this.lifeSource = function() {
      var _this3 = this;
      return new Promise(function(resolve, reject) {
        var url = _this3.requestParams(Defined.localhost + 'lifeevents?memkey=' + (_this3.memkey || ''));
        var red = false;
        var gou = function gou(json, any) {
          if (json.accsdb) return reject(json);
          var last_balanser = _this3.getLastChoiceBalanser();
          if (!red) {
            var _filter = json.online.filter(function(c) {
              var key = balanserName(c);
              var item = sources[key];
              return any ? c.show && item && !item.locked : c.show && item && !item.locked && key == last_balanser;
            });
            if (_filter.length) {
              red = true;
              resolve(json.online.filter(function(c) {
                return c.show;
              }));
            } else if (any) {
              var visible = json.online.filter(function(c) {
                return c.show;
              });

              if (visible.length) {
                red = true;
                resolve(visible);
              } else {
                reject();
              }
            }
          }
        };
        var fin = function fin(call) {
          network.timeout(3000);
          network.silent(account(url), function(json) {
            life_wait_times++;
            filter_sources = [];
            sources = {};
            rememberAccessGroup(json);
            json.online.forEach(function(j) {
              setSource(j);
            });
            rebuildFilterSources();
            filter.set('sort', filter_sources.map(function(e) {
              return {
                title: sourceTitle(e),
                source: e,
                selected: e == balanser,
                ghost: !sources[e].show || sources[e].locked
              };
            }));
            filter.chosen('sort', [sources[balanser] ? sourceTitle(balanser) : balanser]);
            gou(json);
            var lastb = _this3.getLastChoiceBalanser();
            if (life_wait_times > 15 || json.ready) {
              filter.render().find('.lampac-balanser-loader').remove();
              gou(json, true);
            } else if (!red && sources[lastb] && sources[lastb].show && !sources[lastb].locked) {
              gou(json, true);
              life_wait_timer = setTimeout(fin, 1000);
            } else {
              life_wait_timer = setTimeout(fin, 1000);
            }
          }, function() {
            life_wait_times++;
            if (life_wait_times > 15) {
              reject();
            } else {
              life_wait_timer = setTimeout(fin, 1000);
            }
          }, false, {
              headers: addHeaders()
		  });
        };
        fin();
      });
    };
    this.createSource = function() {
      var _this4 = this;
      return new Promise(function(resolve, reject) {
        var url = _this4.requestParams(Defined.localhost + 'lite/events?life=true');
        network.timeout(15000);
        network.silent(account(url), function(json) {
          if (json.accsdb) return reject(json);
          rememberAccessGroup(json);
          if (json.life) {
			_this4.memkey = json.memkey;
			if (json.title) {
              if (object.movie.name) object.movie.name = json.title;
              if (object.movie.title) object.movie.title = json.title;
			}
            filter.render().find('.filter--sort').append('<span class="lampac-balanser-loader" style="width: 1.2em; height: 1.2em; margin-top: 0; background: url(./img/loader.svg) no-repeat 50% 50%; background-size: contain; margin-left: 0.5em"></span>');
            _this4.lifeSource().then(_this4.startSource).then(resolve)["catch"](reject);
          } else {
            _this4.startSource(json).then(resolve)["catch"](reject);
          }
        }, reject, false, {
            headers: addHeaders()
		  });
      });
    };
    /**
     * Подготовка
     */
    this.create = function() {
      return this.render();
    };
    /**
     * Начать поиск
     */
    this.search = function() { //this.loading(true)
      this.filter({
        source: filter_sources
      }, this.getChoice());
      this.find();
    };
    this.find = function() {
      if (sources[balanser] && sources[balanser].locked) {
        this.loading(false);

        if (object.lampac_custom_select) showSourceAccess(balanser);
        else this.empty();

        return;
      }

      this.request(this.requestParams(source));
    };
    this.request = function(url) {
      number_of_requests++;
      if (number_of_requests < 10) {
        network["native"](account(url), this.parse.bind(this), this.doesNotAnswer.bind(this), false, {
          dataType: 'text',
		  headers: addHeaders()
        });
        clearTimeout(number_of_requests_timer);
        number_of_requests_timer = setTimeout(function() {
          number_of_requests = 0;
        }, 4000);
      } else this.empty();
    };
    this.nextBalanser = function(delay) {
      var _this = this;
      clearInterval(balanser_timer);

      balanser_timer = setTimeout(function() {
        var next = nextAutoSource(balanser);
        if (!next) return;

        balanser = next;
        try { Lampa.Modal.close(); } catch (e) {}
        if (Lampa.Activity.active().activity == _this.activity) _this.changeBalanser(balanser);
      }, delay || 3500);
    };
    this.parseJsonDate = function(str, name) {
      try {
        var html = $('<div>' + str + '</div>');
        var elems = [];
        html.find(name).each(function() {
          var item = $(this);
          var data = JSON.parse(item.attr('data-json'));
          var season = item.attr('s');
          var episode = item.attr('e');
          var text = item.text();
          if (!object.movie.name) {
            if (text.match(/\d+p/i)) {
              if (!data.quality) {
                data.quality = {};
                data.quality[text] = data.url;
              }
              text = object.movie.title;
            }
            if (text == 'По умолчанию') {
              text = object.movie.title;
            }
          }
          if (episode) data.episode = parseInt(episode);
          if (season) data.season = parseInt(season);
          if (text) data.text = text;
          data.active = item.hasClass('active');
          elems.push(data);
        });
        return elems;
      } catch (e) {
        return [];
      }
    };
    this.getFileUrl = function(file, call, waiting_rch) {
	  var _this = this;
	  
      if(Lampa.Storage.field('player') !== 'inner' && file.stream && Lampa.Platform.is('apple')){
		  var newfile = Lampa.Arrays.clone(file);
		  newfile.method = 'play';
		  newfile.url = file.stream;
		  call(newfile, {});
	  }
      else if (file.method == 'play') call(file, {});
      else {
        Lampa.Loading.start(function() {
          Lampa.Loading.stop();
          Lampa.Controller.toggle('content');
          network.clear();
        });
        network["native"](account(file.url), function(json) {
			if(json.rch){
				if(waiting_rch) {
					waiting_rch = false;
					Lampa.Loading.stop();
					call(false, {});
				}
				else {
					_this.rch(json,function(){
						Lampa.Loading.stop();
						
						_this.getFileUrl(file, call, true);
					});
				}
			}
			else{
				Lampa.Loading.stop();
				call(json, json);
			}
        }, function() {
          Lampa.Loading.stop();
          call(false, {});
        }, false, {
            headers: addHeaders()
		  });
      }
    };
    this.toPlayElement = function(file) {
      var play = {
        title: file.title,
        url: file.url,
        quality: file.qualitys,
        timeline: file.timeline,
        subtitles: file.subtitles,
		segments: file.segments,
        callback: file.mark,
		season: file.season,
		episode: file.episode,
		voice_name: file.voice_name,
		thumbnail: file.thumbnail
      };
      return play;
    };
    this.orUrlReserve = function(data) {
      if (data.url && typeof data.url == 'string' && data.url.indexOf(" or ") !== -1) {
        var urls = data.url.split(" or ");
        data.url = urls[0];
        data.url_reserve = urls[1];
      }
    };
    this.setDefaultQuality = function(data) {
      if (Lampa.Arrays.getKeys(data.quality).length) {
        for (var q in data.quality) {
          if (parseInt(q) == Lampa.Storage.field('video_quality_default')) {
            data.url = data.quality[q];
            this.orUrlReserve(data);
          }
          if (data.quality[q].indexOf(" or ") !== -1)
            data.quality[q] = data.quality[q].split(" or ")[0];
        }
      }
    };
    this.display = function(videos) {
      var _this5 = this;
      this.draw(videos, {
        onEnter: function onEnter(item, html) {
          _this5.getFileUrl(item, function(json, json_call) {
            if (json && json.url) {
              var playlist = [];
              var first = _this5.toPlayElement(item);
              first.url = json.url;
              first.headers = json_call.headers || json.headers;
              first.quality = json_call.quality || item.qualitys;
			  first.segments = json_call.segments || item.segments;
              first.hls_manifest_timeout = json_call.hls_manifest_timeout || json.hls_manifest_timeout;
              first.subtitles = json.subtitles;
			  first.subtitles_call = json_call.subtitles_call || json.subtitles_call;
			  if (json.vast && json.vast.url) {
                first.vast_url = json.vast.url;
                first.vast_msg = json.vast.msg;
                first.vast_region = json.vast.region;
                first.vast_platform = json.vast.platform;
                first.vast_screen = json.vast.screen;
			  }
              _this5.orUrlReserve(first);
              _this5.setDefaultQuality(first);
              if (item.season) {
                videos.forEach(function(elem) {
                  var cell = _this5.toPlayElement(elem);
                  if (elem == item) cell.url = json.url;
                  else {
                    if (elem.method == 'call') {
                      if (Lampa.Storage.field('player') !== 'inner') {
                        cell.url = elem.stream;
						delete cell.quality;
                      } else {
                        cell.url = function(call) {
                          _this5.getFileUrl(elem, function(stream, stream_json) {
                            if (stream.url) {
                              cell.url = stream.url;
                              cell.quality = stream_json.quality || elem.qualitys;
							  cell.segments = stream_json.segments || elem.segments;
                              cell.subtitles = stream.subtitles;
                              _this5.orUrlReserve(cell);
                              _this5.setDefaultQuality(cell);
                              elem.mark();
                            } else {
                              cell.url = '';
                              Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
                            }
                            call();
                          }, function() {
                            cell.url = '';
                            call();
                          });
                        };
                      }
                    } else {
                      cell.url = elem.url;
                    }
                  }
                  _this5.orUrlReserve(cell);
                  _this5.setDefaultQuality(cell);
                  playlist.push(cell);
                }); //Lampa.Player.playlist(playlist) 
              } else {
                playlist.push(first);
              }
              if (playlist.length > 1) first.playlist = playlist;
              if (first.url) {
                var element = first;
				element.isonline = true;
                
                Lampa.Player.play(element);
                Lampa.Player.playlist(playlist);
				if(element.subtitles_call) _this5.loadSubtitles(element.subtitles_call)
                item.mark();
                _this5.updateBalanser(balanser);
              } else {
                Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
              }
            } else Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
          }, true);
        },
        onContextMenu: function onContextMenu(item, html, data, call) {
          _this5.getFileUrl(item, function(stream) {
            call({
              file: stream.url,
              quality: item.qualitys
            });
          }, true);
        }
      });
      this.filter({
        season: filter_find.season.map(function(s) {
          return s.title;
        }),
        voice: filter_find.voice.map(function(b) {
          return b.title;
        })
      }, this.getChoice());
    };
	this.loadSubtitles = function(link){
		network.silent(account(link), function(subs){
			Lampa.Player.subtitles(subs)
		}, function() {},false, {
            headers: addHeaders()
		  })
	}
    this.parse = function(str) {
      var json = Lampa.Arrays.decodeJson(str, {});
      if (Lampa.Arrays.isObject(str) && (str.rch || str.accsdb)) json = str;
      if (json.accsdb) return this.doesNotAnswer(json);
      if (json.rch) return this.rch(json);
      try {
        var items = this.parseJsonDate(str, '.videos__item');
        var buttons = this.parseJsonDate(str, '.videos__button');
        if (items.length == 1 && items[0].method == 'link' && !items[0].similar) {
          filter_find.season = items.map(function(s) {
            return {
              title: s.text,
              url: s.url
            };
          });
          this.replaceChoice({
            season: 0
          });
          this.request(items[0].url);
        } else {
          this.activity.loader(false);
          var videos = items.filter(function(v) {
            return v.method == 'play' || v.method == 'call';
          });
          var similar = items.filter(function(v) {
            return v.similar;
          });
          if (videos.length) {
            if (buttons.length) {
              filter_find.voice = buttons.map(function(b) {
                return {
                  title: b.text,
                  url: b.url
                };
              });
              var select_voice_url = this.getChoice(balanser).voice_url;
              var select_voice_name = this.getChoice(balanser).voice_name;
              var find_voice_url = buttons.find(function(v) {
                return v.url == select_voice_url;
              });
              var find_voice_name = buttons.find(function(v) {
                return v.text == select_voice_name;
              });
              var find_voice_active = buttons.find(function(v) {
                return v.active;
              }); ////console.log('b',buttons)
              ////console.log('u',find_voice_url)
              ////console.log('n',find_voice_name)
              ////console.log('a',find_voice_active)
              if (find_voice_url && !find_voice_url.active) {
                //console.log('Lampac', 'go to voice', find_voice_url);
                this.replaceChoice({
                  voice: buttons.indexOf(find_voice_url),
                  voice_name: find_voice_url.text
                });
                this.request(find_voice_url.url);
              } else if (find_voice_name && !find_voice_name.active) {
                //console.log('Lampac', 'go to voice', find_voice_name);
                this.replaceChoice({
                  voice: buttons.indexOf(find_voice_name),
                  voice_name: find_voice_name.text
                });
                this.request(find_voice_name.url);
              } else {
                if (find_voice_active) {
                  this.replaceChoice({
                    voice: buttons.indexOf(find_voice_active),
                    voice_name: find_voice_active.text
                  });
                }
                this.display(videos);
              }
            } else {
              this.replaceChoice({
                voice: 0,
                voice_url: '',
                voice_name: ''
              });
              this.display(videos);
            }
          } else if (items.length) {
            if (similar.length) {
              this.similars(similar);
              this.activity.loader(false);
            } else { //this.activity.loader(true)
              filter_find.season = items.map(function(s) {
                return {
                  title: s.text,
                  url: s.url
                };
              });
              var select_season = this.getChoice(balanser).season;
              var season = filter_find.season[select_season];
              if (!season) season = filter_find.season[0];
              //console.log('Lampac', 'go to season', season);
              this.request(season.url);
            }
          } else {
            this.doesNotAnswer(json);
          }
        }
      } catch (e) {
        //console.log('Lampac', 'error', e.stack);
        this.doesNotAnswer(e);
      }
    };
    this.similars = function(json) {
      var _this6 = this;
      scroll.clear();
      json.forEach(function(elem) {
        elem.title = elem.text;
        elem.info = '';
        var info = [];
        var year = ((elem.start_date || elem.year || object.movie.release_date || object.movie.first_air_date || '') + '').slice(0, 4);
        if (year) info.push(year);
        if (elem.details) info.push(elem.details);
        var name = elem.title || elem.text;
        elem.title = name;
        elem.time = elem.time || '';
        elem.info = info.join('<span class="online-prestige-split">●</span>');
        var item = Lampa.Template.get('lampac_prestige_folder', elem);
		if (elem.img) {
		  var image = $('<img style="height: 7em; width: 7em; border-radius: 0.3em;"/>');
		  item.find('.online-prestige__folder').empty().append(image);

		  if (elem.img !== undefined) {
		    if (elem.img.charAt(0) === '/')
		      elem.img = Defined.localhost + elem.img.substring(1);
		    if (elem.img.indexOf('/proxyimg') !== -1)
		      elem.img = account(elem.img);
		  }

		  Lampa.Utils.imgLoad(image, elem.img);
		}
        item.on('hover:enter', function() {
          _this6.reset();
          _this6.request(elem.url);
        }).on('hover:focus', function(e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        scroll.append(item);
      });
	  this.filter({
        season: filter_find.season.map(function(s) {
          return s.title;
        }),
        voice: filter_find.voice.map(function(b) {
          return b.title;
        })
      }, this.getChoice());
      Lampa.Controller.enable('content');
    };
    this.getChoice = function(for_balanser) {
      var data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser), 3000, {});
      var save = data[object.movie.id] || {};
      Lampa.Arrays.extend(save, {
        season: 0,
        voice: 0,
        voice_name: '',
        voice_id: 0,
        episodes_view: {},
        movie_view: ''
      });
      return save;
    };
    this.saveChoice = function(choice, for_balanser) {
      var data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser), 3000, {});
      data[object.movie.id] = choice;
      Lampa.Storage.set('online_choice_' + (for_balanser || balanser), data);
      this.updateBalanser(for_balanser || balanser);
    };
    this.replaceChoice = function(choice, for_balanser) {
      var to = this.getChoice(for_balanser);
      Lampa.Arrays.extend(to, choice, true);
      this.saveChoice(to, for_balanser);
    };
    this.clearImages = function() {
      images.forEach(function(img) {
        img.onerror = function() {};
        img.onload = function() {};
        img.src = '';
      });
      images = [];
    };
    /**
     * Очистить список файлов
     */
    this.reset = function() {
      last = false;
      clearInterval(balanser_timer);
      network.clear();
      this.clearImages();
      scroll.render().find('.empty').remove();
      scroll.clear();
      scroll.reset();
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));
    };
    /**
     * Загрузка
     */
    this.loading = function(status) {
      if (status) this.activity.loader(true);
      else {
        this.activity.loader(false);
        this.activity.toggle();
      }
    };
    /**
     * Построить фильтр
     */
    this.filter = function(filter_items, choice) {
      var _this7 = this;
      var select = [];
      var add = function add(type, title) {
        var need = _this7.getChoice();
        var items = filter_items[type];
        var subitems = [];
        var value = need[type];
        items.forEach(function(name, i) {
          subitems.push({
            title: name,
            selected: value == i,
            index: i
          });
        });
        select.push({
          title: title,
          subtitle: items[value],
          items: subitems,
          stype: type
        });
      };
      filter_items.source = filter_sources;
      select.push({
        title: Lampa.Lang.translate('torrent_parser_reset'),
        reset: true
      });
      this.saveChoice(choice);
      if (filter_items.voice && filter_items.voice.length) add('voice', Lampa.Lang.translate('torrent_parser_voice'));
      if (filter_items.season && filter_items.season.length) add('season', Lampa.Lang.translate('torrent_serial_season'));
      filter.set('filter', select);
      filter.set('sort', filter_sources.map(function(e) {
        return {
          title: sourceTitle(e),
          source: e,
          selected: e == balanser,
          ghost: !sources[e].show || sources[e].locked
        };
      }));
      this.selected(filter_items);
    };
    /**
     * Показать что выбрано в фильтре
     */
    this.selected = function(filter_items) {
      var need = this.getChoice(),
        select = [];
      for (var i in need) {
        if (filter_items[i] && filter_items[i].length) {
          if (i == 'voice') {
            select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
          } else if (i !== 'source') {
            if (filter_items.season.length >= 1) {
              select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
            }
          }
        }
      }
      filter.chosen('filter', select);
      filter.chosen('sort', [sourceTitle(balanser)]);
    };
    this.getEpisodes = function(season, call) {
      var episodes = [];
	  var tmdb_id = object.movie.id;
	  if (['cub', 'tmdb'].indexOf(object.movie.source || 'tmdb') == -1) 
        tmdb_id = object.movie.tmdb_id;
      if (typeof tmdb_id == 'number' && object.movie.name) {
		  Lampa.Api.sources.tmdb.get('tv/' + tmdb_id + '/season/' + season, {}, function(data){
			  episodes = data.episodes || [];
			  
			  call(episodes);
		  }, function(){
			  call(episodes);
		  })
      } else call(episodes);
    };
    this.watched = function(set) {
      var file_id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
      var watched = Lampa.Storage.cache('online_watched_last', 5000, {});
      if (set) {
        if (!watched[file_id]) watched[file_id] = {};
        Lampa.Arrays.extend(watched[file_id], set, true);
        Lampa.Storage.set('online_watched_last', watched);
        this.updateWatched();
      } else {
        return watched[file_id];
      }
    };
    this.updateWatched = function() {
      var watched = this.watched();
      var body = scroll.body().find('.online-prestige-watched .online-prestige-watched__body').empty();
      if (watched) {
        var line = [];
        if (watched.balanser_name) line.push(watched.balanser_name);
        if (watched.voice_name) line.push(watched.voice_name);
        if (watched.season) line.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + watched.season);
        if (watched.episode) line.push(Lampa.Lang.translate('torrent_serial_episode') + ' ' + watched.episode);
        line.forEach(function(n) {
          body.append('<span>' + n + '</span>');
        });
      } else body.append('<span>' + Lampa.Lang.translate('lampac_no_watch_history') + '</span>');
    };
    /**
     * Отрисовка файлов
     */
    this.draw = function(items) {
      var _this8 = this;
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (!items.length) return this.empty();
      scroll.clear();
      if(!object.balanser)scroll.append(Lampa.Template.get('lampac_prestige_watched', {}));
      this.updateWatched();
      this.getEpisodes(items[0].season, function(episodes) {
        var viewed = Lampa.Storage.cache('online_view', 5000, []);
        var serial = object.movie.name ? true : false;
        var choice = _this8.getChoice();
        var fully = window.innerWidth > 480;
        var scroll_to_element = false;
        var scroll_to_mark = false;
        items.forEach(function(element, index) {
          var episode = serial && episodes.length && !params.similars ? episodes.find(function(e) {
            return e.episode_number == element.episode;
          }) : false;
          var episode_num = element.episode || index + 1;
          var episode_last = choice.episodes_view[element.season];
          var voice_name = choice.voice_name || (filter_find.voice[0] ? filter_find.voice[0].title : false) || element.voice_name || (serial ? 'Неизвестно' : element.text) || 'Неизвестно';
          if (element.quality) {
            element.qualitys = element.quality;
            element.quality = Lampa.Arrays.getKeys(element.quality)[0];
          }
          Lampa.Arrays.extend(element, {
            voice_name: voice_name,
            info: voice_name.length > 60 ? voice_name.substr(0, 60) + '...' : voice_name,
            quality: '',
            time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true)
          });
          var hash_timeline = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var hash_behold = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title, element.voice_name].join('') : object.movie.original_title + element.voice_name);
          var data = {
            hash_timeline: hash_timeline,
            hash_behold: hash_behold
          };
          var info = [];
          if (element.season) {
            element.translate_episode_end = _this8.getLastEpisode(items);
            element.translate_voice = element.voice_name;
          }
          if (element.text && !episode) element.title = element.text;
          element.timeline = Lampa.Timeline.view(hash_timeline);
          if (episode) {
            element.title = episode.name;
            if (element.info.length < 30 && episode.vote_average) info.push(Lampa.Template.get('lampac_prestige_rate', {
              rate: parseFloat(episode.vote_average + '').toFixed(1)
            }, true));
            if (episode.air_date && fully) info.push(Lampa.Utils.parseTime(episode.air_date).full);
          } else if (object.movie.release_date && fully) {
            info.push(Lampa.Utils.parseTime(object.movie.release_date).full);
          }
          if (!serial && object.movie.tagline && element.info.length < 30) info.push(object.movie.tagline);
          if (element.info) info.push(element.info);
          if (info.length) element.info = info.map(function(i) {
            return '<span>' + i + '</span>';
          }).join('<span class="online-prestige-split">●</span>');
          var html = Lampa.Template.get('lampac_prestige_full', element);
          var loader = html.find('.online-prestige__loader');
          var image = html.find('.online-prestige__img');
		  if(object.balanser) image.hide();
          if (!serial) {
            if (choice.movie_view == hash_behold) scroll_to_element = html;
          } else if (typeof episode_last !== 'undefined' && episode_last == episode_num) {
            scroll_to_element = html;
          }
          if (serial && !episode) {
            image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(element.episode || index + 1) + '</div>');
            loader.remove();
          }
		  else if (!serial && object.movie.backdrop_path == 'undefined') loader.remove();
          else {
            var img = html.find('img')[0];
            img.onerror = function() {
              img.src = './img/img_broken.svg';
            };
            img.onload = function() {
              image.addClass('online-prestige__img--loaded');
              loader.remove();
              if (serial) image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(element.episode || index + 1) + '</div>');
            };
            img.src = Lampa.TMDB.image('t/p/w300' + (episode ? episode.still_path : object.movie.backdrop_path));
            images.push(img);
			element.thumbnail = img.src
          }
          html.find('.online-prestige__timeline').append(Lampa.Timeline.render(element.timeline));
          if (viewed.indexOf(hash_behold) !== -1) {
            scroll_to_mark = html;
            html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
          }
          element.mark = function() {
            viewed = Lampa.Storage.cache('online_view', 5000, []);
            if (viewed.indexOf(hash_behold) == -1) {
              viewed.push(hash_behold);
              Lampa.Storage.set('online_view', viewed);
              if (html.find('.online-prestige__viewed').length == 0) {
                html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
              }
            }
            choice = _this8.getChoice();
            if (!serial) {
              choice.movie_view = hash_behold;
            } else {
              choice.episodes_view[element.season] = episode_num;
            }
            _this8.saveChoice(choice);
            var voice_name_text = choice.voice_name || element.voice_name || element.title;
            if (voice_name_text.length > 30) voice_name_text = voice_name_text.slice(0, 30) + '...';
            _this8.watched({
              balanser: balanser,
              balanser_name: Lampa.Utils.capitalizeFirstLetter(sources[balanser] ? sources[balanser].name.split(' ')[0] : balanser),
              voice_id: choice.voice_id,
              voice_name: voice_name_text,
              episode: element.episode,
              season: element.season
            });
          };
          element.unmark = function() {
            viewed = Lampa.Storage.cache('online_view', 5000, []);
            if (viewed.indexOf(hash_behold) !== -1) {
              Lampa.Arrays.remove(viewed, hash_behold);
              Lampa.Storage.set('online_view', viewed);
              Lampa.Storage.remove('online_view', hash_behold);
              html.find('.online-prestige__viewed').remove();
            }
          };
          element.timeclear = function() {
            element.timeline.percent = 0;
            element.timeline.time = 0;
            element.timeline.duration = 0;
            Lampa.Timeline.update(element.timeline);
          };
          html.on('hover:enter', function() {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            if (params.onEnter) params.onEnter(element, html, data);
          }).on('hover:focus', function(e) {
            last = e.target;
            if (params.onFocus) params.onFocus(element, html, data);
            scroll.update($(e.target), true);
          });
          if (params.onRender) params.onRender(element, html, data);
          _this8.contextMenu({
            html: html,
            element: element,
            onFile: function onFile(call) {
              if (params.onContextMenu) params.onContextMenu(element, html, data, call);
            },
            onClearAllMark: function onClearAllMark() {
              items.forEach(function(elem) {
                elem.unmark();
              });
            },
            onClearAllTime: function onClearAllTime() {
              items.forEach(function(elem) {
                elem.timeclear();
              });
            }
          });
          scroll.append(html);
        });
        if (serial && episodes.length > items.length && !params.similars) {
          var left = episodes.slice(items.length);
          left.forEach(function(episode) {
            var info = [];
            if (episode.vote_average) info.push(Lampa.Template.get('lampac_prestige_rate', {
              rate: parseFloat(episode.vote_average + '').toFixed(1)
            }, true));
            if (episode.air_date) info.push(Lampa.Utils.parseTime(episode.air_date).full);
            var air = new Date((episode.air_date + '').replace(/-/g, '/'));
            var now = Date.now();
            var day = Math.round((air.getTime() - now) / (24 * 60 * 60 * 1000));
            var txt = Lampa.Lang.translate('full_episode_days_left') + ': ' + day;
            var html = Lampa.Template.get('lampac_prestige_full', {
              time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true),
              info: info.length ? info.map(function(i) {
                return '<span>' + i + '</span>';
              }).join('<span class="online-prestige-split">●</span>') : '',
              title: episode.name,
              quality: day > 0 ? txt : ''
            });
            var loader = html.find('.online-prestige__loader');
            var image = html.find('.online-prestige__img');
            var season = items[0] ? items[0].season : 1;
            html.find('.online-prestige__timeline').append(Lampa.Timeline.render(Lampa.Timeline.view(Lampa.Utils.hash([season, episode.episode_number, object.movie.original_title].join('')))));
            var img = html.find('img')[0];
            if (episode.still_path) {
              img.onerror = function() {
                img.src = './img/img_broken.svg';
              };
              img.onload = function() {
                image.addClass('online-prestige__img--loaded');
                loader.remove();
                image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(episode.episode_number) + '</div>');
              };
              img.src = Lampa.TMDB.image('t/p/w300' + episode.still_path);
              images.push(img);
            } else {
              loader.remove();
              image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(episode.episode_number) + '</div>');
            }
            html.on('hover:focus', function(e) {
              last = e.target;
              scroll.update($(e.target), true);
            });
            html.css('opacity', '0.5');
            scroll.append(html);
          });
        }
        if (scroll_to_element) {
          last = scroll_to_element[0];
        } else if (scroll_to_mark) {
          last = scroll_to_mark[0];
        }
        Lampa.Controller.enable('content');
      });
    };
    /**
     * Меню
     */
    this.contextMenu = function(params) {
      params.html.on('hover:long', function() {
        function show(extra) {
          var enabled = Lampa.Controller.enabled().name;
          var menu = [];
          if (Lampa.Platform.is('webos')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Webos',
              player: 'webos'
            });
          }
          if (Lampa.Platform.is('android')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Android',
              player: 'android'
            });
          }
          menu.push({
            title: Lampa.Lang.translate('player_lauch') + ' - Lampa',
            player: 'lampa'
          });
          menu.push({
            title: Lampa.Lang.translate('lampac_video'),
            separator: true
          });
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_title'),
            mark: true
          });
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_cancel_title'),
            unmark: true
          });
          menu.push({
            title: Lampa.Lang.translate('time_reset'),
            timeclear: true
          });
          if (extra) {
            menu.push({
              title: Lampa.Lang.translate('copy_link'),
              copylink: true
            });
          }
          if (window.lampac_online_context_menu)
            window.lampac_online_context_menu.push(menu, extra, params);
          menu.push({
            title: Lampa.Lang.translate('more'),
            separator: true
          });
          if (Lampa.Account.logged() && params.element && typeof params.element.season !== 'undefined' && params.element.translate_voice) {
            menu.push({
              title: Lampa.Lang.translate('lampac_voice_subscribe'),
              subscribe: true
            });
          }
          menu.push({
            title: Lampa.Lang.translate('lampac_clear_all_marks'),
            clearallmark: true
          });
          menu.push({
            title: Lampa.Lang.translate('lampac_clear_all_timecodes'),
            timeclearall: true
          });
          Lampa.Select.show({
            title: Lampa.Lang.translate('title_action'),
            items: menu,
            onBack: function onBack() {
              Lampa.Controller.toggle(enabled);
            },
            onSelect: function onSelect(a) {
              if (a.mark) params.element.mark();
              if (a.unmark) params.element.unmark();
              if (a.timeclear) params.element.timeclear();
              if (a.clearallmark) params.onClearAllMark();
              if (a.timeclearall) params.onClearAllTime();
              if (window.lampac_online_context_menu)
                window.lampac_online_context_menu.onSelect(a, params);
              Lampa.Controller.toggle(enabled);
              if (a.player) {
                Lampa.Player.runas(a.player);
                params.html.trigger('hover:enter');
              }
              if (a.copylink) {
                if (extra.quality) {
                  var qual = [];
                  for (var i in extra.quality) {
                    qual.push({
                      title: i,
                      file: extra.quality[i]
                    });
                  }
                  Lampa.Select.show({
                    title: Lampa.Lang.translate('settings_server_links'),
                    items: qual,
                    onBack: function onBack() {
                      Lampa.Controller.toggle(enabled);
                    },
                    onSelect: function onSelect(b) {
                      Lampa.Utils.copyTextToClipboard(b.file, function() {
                        Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
                      }, function() {
                        Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
                      });
                    }
                  });
                } else {
                  Lampa.Utils.copyTextToClipboard(extra.file, function() {
                    Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
                  }, function() {
                    Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
                  });
                }
              }
              if (a.subscribe) {
                Lampa.Account.subscribeToTranslation({
                  card: object.movie,
                  season: params.element.season,
                  episode: params.element.translate_episode_end,
                  voice: params.element.translate_voice
                }, function() {
                  Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_success'));
                }, function() {
                  Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_error'));
                });
              }
            }
          });
        }
        params.onFile(show);
      }).on('hover:focus', function() {
        if (Lampa.Helper) Lampa.Helper.show('online_file', Lampa.Lang.translate('helper_online_file'), params.html);
      });
    };
    /**
     * Показать пустой результат
     */
    this.empty = function() {
      var html = Lampa.Template.get('lampac_does_not_answer', {});
      html.find('.online-empty__buttons').remove();
      html.find('.online-empty__title').text(Lampa.Lang.translate('empty_title_two'));
      html.find('.online-empty__time').text(Lampa.Lang.translate('empty_text'));
      scroll.clear();
      scroll.append(html);
      this.loading(false);
    };
    this.noConnectToServer = function(er) {
      var denied = accessData(er);
      if (denied) {
        var _this = this;
        this.loading(false);
        setTimeout(function() {
          accessModal(denied, function() {
            _this.nextBalanser(10);
          });
        }, 50);
        this.nextBalanser(6000);
        return;
      }

      var html = Lampa.Template.get('lampac_does_not_answer', {});
      html.find('.online-empty__buttons').remove();
      html.find('.online-empty__title').text(Lampa.Lang.translate('title_error'));
      html.find('.online-empty__time').text(er && er.accsdb ? er.msg : Lampa.Lang.translate('lampac_does_not_answer_text').replace('{balanser}', balanser[balanser].name));
      scroll.clear();
      scroll.append(html);
      this.loading(false);
    };
    this.doesNotAnswer = function(er) {
      var _this9 = this;
      this.reset();

      var denied = accessData(er);
      if (denied) {
        this.loading(false);
        setTimeout(function() {
          accessModal(denied, function() {
            _this9.nextBalanser(10);
          });
        }, 50);
        this.nextBalanser(6000);
        return;
      }

      var html = Lampa.Template.get('lampac_does_not_answer', {
        balanser: balanser
      });
      if(er && er.accsdb) html.find('.online-empty__title').html(er.msg);
	  
      var tic = er && er.accsdb ? 10 : 5;
      html.find('.cancel').on('hover:enter', function() {
        clearInterval(balanser_timer);
      });
      html.find('.change').on('hover:enter', function() {
        clearInterval(balanser_timer);
        filter.render().find('.filter--sort').trigger('hover:enter');
      });
      scroll.clear();
      scroll.append(html);
      this.loading(false);
      balanser_timer = setInterval(function() {
        tic--;
        html.find('.timeout').text(tic);
        if (tic == 0) {
          clearInterval(balanser_timer);
          var next = nextAutoSource(balanser);
          if (!next) return;
          balanser = next;
          if (Lampa.Activity.active().activity == _this9.activity) _this9.changeBalanser(balanser);
        }
      }, 1000);
    };
    this.getLastEpisode = function(items) {
      var last_episode = 0;
      items.forEach(function(e) {
        if (typeof e.episode !== 'undefined') last_episode = Math.max(last_episode, parseInt(e.episode));
      });
      return last_episode;
    };
    /**
     * Начать навигацию по файлам
     */
    this.start = function() {
      if (Lampa.Activity.active().activity !== this.activity) return;
      if (!initialized) {
        initialized = true;
        this.initialize();
      }
      Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
      Lampa.Controller.add('content', {
        toggle: function toggle() {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        gone: function gone() {
          clearTimeout(balanser_timer);
        },
        up: function up() {
          if (Navigator.canmove('up')) {
            Navigator.move('up');
          } else Lampa.Controller.toggle('head');
        },
        down: function down() {
          Navigator.move('down');
        },
        right: function right() {
          if (Navigator.canmove('right')) Navigator.move('right');
          else filter.show(Lampa.Lang.translate('title_filter'), 'filter');
        },
        left: function left() {
          if (Navigator.canmove('left')) Navigator.move('left');
          else Lampa.Controller.toggle('menu');
        },
        back: this.back.bind(this)
      });
      Lampa.Controller.toggle('content');
    };
    this.render = function() {
      return files.render();
    };
    this.back = function() {
      Lampa.Activity.backward();
    };
    this.pause = function() {};
    this.stop = function() {};
    this.destroy = function() {
      network.clear();
      this.clearImages();
      files.destroy();
      scroll.destroy();
      clearInterval(balanser_timer);
      clearTimeout(life_wait_timer);
    };
  }
  
  function addSourceSearch(spiderName, spiderUri) {
    var network = new Lampa.Reguest();

    var source = {
      title: spiderName,
      search: function(params, oncomplite) {
        function searchComplite(links) {
          var keys = Lampa.Arrays.getKeys(links);

          if (keys.length) {
            var status = new Lampa.Status(keys.length);

            status.onComplite = function(result) {
              var rows = [];

              keys.forEach(function(name) {
                var line = result[name];

                if (line && line.data && line.type == 'similar') {
                  var cards = line.data.map(function(item) {
                    item.title = Lampa.Utils.capitalizeFirstLetter(item.title);
                    item.release_date = item.year || '0000';
                    item.balanser = spiderUri;
                    if (item.img !== undefined) {
                      if (item.img.charAt(0) === '/')
                        item.img = Defined.localhost + item.img.substring(1);
                      if (item.img.indexOf('/proxyimg') !== -1)
                        item.img = account(item.img);
                    }

                    return item;
                  })

                  rows.push({
                    title: name,
                    results: cards
                  })
                }
              })

              oncomplite(rows);
            }

            keys.forEach(function(name) {
              network.silent(account(links[name]), function(data) {
                status.append(name, data);
              }, function() {
                status.error();
              }, false, {
                  headers: addHeaders()
		  })
            })
          } else {
            oncomplite([]);
          }
        }

        network.silent(account(Defined.localhost + 'lite/' + spiderUri + '?title=' + params.query), function(json) {
          if (json.rch) {
            rchRun(json, function() {
              network.silent(account(Defined.localhost + 'lite/' + spiderUri + '?title=' + params.query), function(links) {
                searchComplite(links);
              }, function() {
                oncomplite([]);
              }, false, {
                  headers: addHeaders()
		  });
            });
          } else {
            searchComplite(json);
          }
        }, function() {
          oncomplite([]);
        }, false, {
            headers: addHeaders()
		  });
      },
      onCancel: function() {
        network.clear()
      },
      params: {
        lazy: true,
        align_left: true,
        card_events: {
          onMenu: function() {}
        }
      },
      onMore: function(params, close) {
        close();
      },
      onSelect: function(params, close) {
        close();

        Lampa.Activity.push({
          url: params.element.url,
          title: 'Lampac - ' + params.element.title,
          component: 'LampaUaNg',
          movie: params.element,
          page: 1,
          search: params.element.title,
          clarification: true,
          balanser: params.element.balanser,
          noinfo: true
        });
      }
    }

    Lampa.Search.addSource(source)
  }

  function startPlugin() {
    window.LampaUaNg_plugin = true;
    var manifst = {
      type: 'video',
      version: '',
      name: 'LampaUa NextGen',
      description: 'Плагин для просмотра онлайн сериалов и фильмов',
      component: 'LampaUaNg',
      onContextMenu: function onContextMenu(object) {
        return {
          name: Lampa.Lang.translate('lampac_watch'),
          description: ''
        };
      },
      onContextLauch: function onContextLauch(object) {
        resetTemplates();
        Lampa.Component.add('LampaUaNg', component);
		
		var id = Lampa.Utils.hash(object.number_of_seasons ? object.original_name : object.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'LampaUaNg',
          search: all[id] ? all[id] : object.title,
          search_one: object.title,
          search_two: object.original_title,
          movie: object,
          page: 1,
		  clarification: all[id] ? true : false
        });
      }
    };
	addSourceSearch('LampaUa NextGen', 'spider');
	addSourceSearch('LampaUa NextGen - Anime', 'spider/anime');
    Lampa.Manifest.plugins = manifst;
    Lampa.Lang.add({
      lampac_watch: { //
        ru: 'Смотреть онлайн',
        en: 'Watch online',
        uk: 'Дивитися онлайн',
        zh: '在线观看'
      },
      lampac_video: { //
        ru: 'Видео',
        en: 'Video',
        uk: 'Відео',
        zh: '视频'
      },
      lampac_no_watch_history: {
        ru: 'Нет истории просмотра',
        en: 'No browsing history',
        ua: 'Немає історії перегляду',
        zh: '没有浏览历史'
      },
      lampac_nolink: {
        ru: 'Не удалось извлечь ссылку',
        uk: 'Неможливо отримати посилання',
        en: 'Failed to fetch link',
        zh: '获取链接失败'
      },
      lampac_balanser: { //
        ru: 'Источник',
        uk: 'Джерело',
        en: 'Source',
        zh: '来源'
      },
      helper_online_file: { //
        ru: 'Удерживайте клавишу "ОК" для вызова контекстного меню',
        uk: 'Утримуйте клавішу "ОК" для виклику контекстного меню',
        en: 'Hold the "OK" key to bring up the context menu',
        zh: '按住“确定”键调出上下文菜单'
      },
      title_online: { //
        ru: 'Онлайн',
        uk: 'Онлайн',
        en: 'Online',
        zh: '在线的'
      },
      lampac_voice_subscribe: { //
        ru: 'Подписаться на перевод',
        uk: 'Підписатися на переклад',
        en: 'Subscribe to translation',
        zh: '订阅翻译'
      },
      lampac_voice_success: { //
        ru: 'Вы успешно подписались',
        uk: 'Ви успішно підписалися',
        en: 'You have successfully subscribed',
        zh: '您已成功订阅'
      },
      lampac_voice_error: { //
        ru: 'Возникла ошибка',
        uk: 'Виникла помилка',
        en: 'An error has occurred',
        zh: '发生了错误'
      },
      lampac_clear_all_marks: { //
        ru: 'Очистить все метки',
        uk: 'Очистити всі мітки',
        en: 'Clear all labels',
        zh: '清除所有标签'
      },
      lampac_clear_all_timecodes: { //
        ru: 'Очистить все тайм-коды',
        uk: 'Очистити всі тайм-коди',
        en: 'Clear all timecodes',
        zh: '清除所有时间代码'
      },
      lampac_change_balanser: { //
        ru: 'Изменить балансер',
        uk: 'Змінити балансер',
        en: 'Change balancer',
        zh: '更改平衡器'
      },
      lampac_balanser_dont_work: { //
        ru: 'Поиск на ({balanser}) не дал результатов',
        uk: 'Пошук на ({balanser}) не дав результатів',
        en: 'Search on ({balanser}) did not return any results',
        zh: '搜索 ({balanser}) 未返回任何结果'
      },
      lampac_balanser_timeout: { //
        ru: 'Источник будет переключен автоматически через <span class="timeout">10</span> секунд.',
        uk: 'Джерело буде автоматично переключено через <span class="timeout">10</span> секунд.',
        en: 'The source will be switched automatically after <span class="timeout">10</span> seconds.',
        zh: '平衡器将在<span class="timeout">10</span>秒内自动切换。'
      },
      lampac_does_not_answer_text: {
        ru: 'Поиск на ({balanser}) не дал результатов',
        uk: 'Пошук на ({balanser}) не дав результатів',
        en: 'Search on ({balanser}) did not return any results',
        zh: '搜索 ({balanser}) 未返回任何结果'
      }
    });
    Lampa.Template.add('lampac_css', "\n        <style>\n        @charset 'UTF-8';.online-prestige{position:relative;-webkit-border-radius:.3em;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-prestige__body{padding:1.2em;line-height:1.3;-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;position:relative}@media screen and (max-width:480px){.online-prestige__body{padding:.8em 1.2em}}.online-prestige__img{position:relative;width:13em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;min-height:8.2em}.online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;-o-object-fit:cover;object-fit:cover;-webkit-border-radius:.3em;border-radius:.3em;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.online-prestige__img--loaded>img{opacity:1}@media screen and (max-width:480px){.online-prestige__img{width:7em;min-height:6em}}.online-prestige__folder{padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige__folder>svg{width:4.4em !important;height:4.4em !important}.online-prestige__viewed{position:absolute;top:1em;left:1em;background:rgba(0,0,0,0.45);-webkit-border-radius:100%;border-radius:100%;padding:.25em;font-size:.76em}.online-prestige__viewed>svg{width:1.5em !important;height:1.5em !important}.online-prestige__episode-number{position:absolute;top:0;left:0;right:0;bottom:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;font-size:2em}.online-prestige__loader{position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center center;-webkit-background-size:contain;-o-background-size:contain;background-size:contain}.online-prestige__head,.online-prestige__footer{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige__timeline{margin:.8em 0}.online-prestige__timeline>.time-line{display:block !important}.online-prestige__title{font-size:1.7em;overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}@media screen and (max-width:480px){.online-prestige__title{font-size:1.4em}}.online-prestige__time{padding-left:2em}.online-prestige__info{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige__info>*{overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}.online-prestige__quality{padding-left:1em;white-space:nowrap}.online-prestige__scan-file{position:absolute;bottom:0;left:0;right:0}.online-prestige__scan-file .broadcast__scan{margin:0}.online-prestige .online-prestige-split{font-size:.8em;margin:0 1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige.focus::after{content:'';position:absolute;top:-0.6em;left:-0.6em;right:-0.6em;bottom:-0.6em;-webkit-border-radius:.7em;border-radius:.7em;border:solid .3em #fff;z-index:-1;pointer-events:none}.online-prestige+.online-prestige{margin-top:1.5em}.online-prestige--folder .online-prestige__footer{margin-top:.8em}.online-prestige-watched{padding:1em}.online-prestige-watched__icon>svg{width:1.5em;height:1.5em}.online-prestige-watched__body{padding-left:1em;padding-top:.1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap}.online-prestige-watched__body>span+span::before{content:' ● ';vertical-align:top;display:inline-block;margin:0 .5em}.online-prestige-rate{display:-webkit-inline-box;display:-webkit-inline-flex;display:-moz-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige-rate>svg{width:1.3em !important;height:1.3em !important}.online-prestige-rate>span{font-weight:600;font-size:1.1em;padding-left:.7em}.online-empty{line-height:1.4}.online-empty__title{font-size:1.8em;margin-bottom:.3em}.online-empty__time{font-size:1.2em;font-weight:300;margin-bottom:1.6em}.online-empty__buttons{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-empty__buttons>*+*{margin-left:1em}.online-empty__button{background:rgba(0,0,0,0.3);font-size:1.2em;padding:.5em 1.2em;-webkit-border-radius:.2em;border-radius:.2em;margin-bottom:2.4em}.online-empty__button.focus{background:#fff;color:black}.online-empty__templates .online-empty-template:nth-child(2){opacity:.5}.online-empty__templates .online-empty-template:nth-child(3){opacity:.2}.online-empty-template{background-color:rgba(255,255,255,0.3);padding:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-border-radius:.3em;border-radius:.3em}.online-empty-template>*{background:rgba(0,0,0,0.3);-webkit-border-radius:.3em;border-radius:.3em}.online-empty-template__ico{width:4em;height:4em;margin-right:2.4em}.online-empty-template__body{height:1.7em;width:70%}.online-empty-template+.online-empty-template{margin-top:1em}\n        </style>\n    ");
    $('body').append(Lampa.Template.get('lampac_css', {}, true));

    function resetTemplates() {
      Lampa.Template.add('lampac_prestige_full', "<div class=\"online-prestige online-prestige--full selector\">\n            <div class=\"online-prestige__img\">\n                <img alt=\"\">\n                <div class=\"online-prestige__loader\"></div>\n            </div>\n            <div class=\"online-prestige__body\">\n                <div class=\"online-prestige__head\">\n                    <div class=\"online-prestige__title\">{title}</div>\n                    <div class=\"online-prestige__time\">{time}</div>\n                </div>\n\n                <div class=\"online-prestige__timeline\"></div>\n\n                <div class=\"online-prestige__footer\">\n                    <div class=\"online-prestige__info\">{info}</div>\n                    <div class=\"online-prestige__quality\">{quality}</div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('lampac_content_loading', "<div class=\"online-empty\">\n            <div class=\"broadcast__scan\"><div></div></div>\n\t\t\t\n            <div class=\"online-empty__templates\">\n                <div class=\"online-empty-template selector\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('lampac_does_not_answer', "<div class=\"online-empty\">\n            <div class=\"online-empty__title\">\n                #{lampac_balanser_dont_work}\n            </div>\n            <div class=\"online-empty__time\">\n                #{lampac_balanser_timeout}\n            </div>\n            <div class=\"online-empty__buttons\">\n                <div class=\"online-empty__button selector cancel\">#{cancel}</div>\n                <div class=\"online-empty__button selector change\">#{lampac_change_balanser}</div>\n            </div>\n            <div class=\"online-empty__templates\">\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('lampac_prestige_rate', "<div class=\"online-prestige-rate\">\n            <svg width=\"17\" height=\"16\" viewBox=\"0 0 17 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                <path d=\"M8.39409 0.192139L10.99 5.30994L16.7882 6.20387L12.5475 10.4277L13.5819 15.9311L8.39409 13.2425L3.20626 15.9311L4.24065 10.4277L0 6.20387L5.79819 5.30994L8.39409 0.192139Z\" fill=\"#fff\"></path>\n            </svg>\n            <span>{rate}</span>\n        </div>");
      Lampa.Template.add('lampac_prestige_folder', "<div class=\"online-prestige online-prestige--folder selector\">\n            <div class=\"online-prestige__folder\">\n                <svg viewBox=\"0 0 128 112\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <rect y=\"20\" width=\"128\" height=\"92\" rx=\"13\" fill=\"white\"></rect>\n                    <path d=\"M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z\" fill=\"white\" fill-opacity=\"0.23\"></path>\n                    <rect x=\"11\" y=\"8\" width=\"106\" height=\"76\" rx=\"13\" fill=\"white\" fill-opacity=\"0.51\"></rect>\n                </svg>\n            </div>\n            <div class=\"online-prestige__body\">\n                <div class=\"online-prestige__head\">\n                    <div class=\"online-prestige__title\">{title}</div>\n                    <div class=\"online-prestige__time\">{time}</div>\n                </div>\n\n                <div class=\"online-prestige__footer\">\n                    <div class=\"online-prestige__info\">{info}</div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('lampac_prestige_watched', "<div class=\"online-prestige online-prestige-watched selector\">\n            <div class=\"online-prestige-watched__icon\">\n                <svg width=\"21\" height=\"21\" viewBox=\"0 0 21 21\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <circle cx=\"10.5\" cy=\"10.5\" r=\"9\" stroke=\"currentColor\" stroke-width=\"3\"/>\n                    <path d=\"M14.8477 10.5628L8.20312 14.399L8.20313 6.72656L14.8477 10.5628Z\" fill=\"currentColor\"/>\n                </svg>\n            </div>\n            <div class=\"online-prestige-watched__body\">\n                \n            </div>\n        </div>");
    }
    var button = "<div class=\"full-start__button selector view--online lampac--button\" data-subtitle=\"".concat(manifst.name, " ").concat(manifst.version, "\">\n        <svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 392.697 392.697\" xml:space=\"preserve\">\n            <path d=\"M21.837,83.419l36.496,16.678L227.72,19.886c1.229-0.592,2.002-1.846,1.98-3.209c-0.021-1.365-0.834-2.592-2.082-3.145\n                L197.766,0.3c-0.903-0.4-1.933-0.4-2.837,0L21.873,77.036c-1.259,0.559-2.073,1.803-2.081,3.18\n                C19.784,81.593,20.584,82.847,21.837,83.419z\" fill=\"currentColor\"></path>\n            <path d=\"M185.689,177.261l-64.988-30.01v91.617c0,0.856-0.44,1.655-1.167,2.114c-0.406,0.257-0.869,0.386-1.333,0.386\n                c-0.368,0-0.736-0.082-1.079-0.244l-68.874-32.625c-0.869-0.416-1.421-1.293-1.421-2.256v-92.229L6.804,95.5\n                c-1.083-0.496-2.344-0.406-3.347,0.238c-1.002,0.645-1.608,1.754-1.608,2.944v208.744c0,1.371,0.799,2.615,2.045,3.185\n                l178.886,81.768c0.464,0.211,0.96,0.315,1.455,0.315c0.661,0,1.318-0.188,1.892-0.555c1.002-0.645,1.608-1.754,1.608-2.945\n                V180.445C187.735,179.076,186.936,177.831,185.689,177.261z\" fill=\"currentColor\"></path>\n            <path d=\"M389.24,95.74c-1.002-0.644-2.264-0.732-3.347-0.238l-178.876,81.76c-1.246,0.57-2.045,1.814-2.045,3.185v208.751\n                c0,1.191,0.606,2.302,1.608,2.945c0.572,0.367,1.23,0.555,1.892,0.555c0.495,0,0.991-0.104,1.455-0.315l178.876-81.768\n                c1.246-0.568,2.045-1.813,2.045-3.185V98.685C390.849,97.494,390.242,96.384,389.24,95.74z\" fill=\"currentColor\"></path>\n            <path d=\"M372.915,80.216c-0.009-1.377-0.823-2.621-2.082-3.18l-60.182-26.681c-0.938-0.418-2.013-0.399-2.938,0.045\n                l-173.755,82.992l60.933,29.117c0.462,0.211,0.958,0.316,1.455,0.316s0.993-0.105,1.455-0.316l173.066-79.092\n                C372.122,82.847,372.923,81.593,372.915,80.216z\" fill=\"currentColor\"></path>\n        </svg>\n\n        <span>#{title_online}</span>\n    </div>"); // нужна заглушка, а то при страте лампы говорит пусто
$('body').append('<style>\
.lampac--button > svg,\
.selectbox-item__icon svg[viewBox="0 0 392.697 392.697"] {\
  background: url("data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%3Cpath%20d%3D%22M3%204h3v9.2c0%202.2%201%203.6%202.8%203.6s2.8-1.4%202.8-3.6V4h3v9.2c0%204-2.3%206.9-5.8%206.9S3%2017.2%203%2013.2V4z%22%20fill%3D%22%239A7A00%22%20transform%3D%22translate(0.8%200.8)%22%20opacity%3D%220.85%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M17.4%204l5.2%2016h-3.1l-.9-3h-4.9l-1%203H9.7L15%204h2.4zm.4%2010.4l-1.6-5.3-1.7%205.3h3.3z%22%20fill%3D%22%23002D66%22%20transform%3D%22translate(0.8%200.8)%22%20opacity%3D%220.85%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M3%204h3v9.2c0%202.2%201%203.6%202.8%203.6s2.8-1.4%202.8-3.6V4h3v9.2c0%204-2.3%206.9-5.8%206.9S3%2017.2%203%2013.2V4z%22%20fill%3D%22%23FFD700%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M17.4%204l5.2%2016h-3.1l-.9-3h-4.9l-1%203H9.7L15%204h2.4zm.4%2010.4l-1.6-5.3-1.7%205.3h3.3z%22%20fill%3D%22%230057B7%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M4%204.7h1.1v8.6c0%202.8%201.4%204.5%203.7%204.5%22%20fill%3D%22none%22%20stroke%3D%22%23FFF2A3%22%20stroke-width%3D%220.75%22%20stroke-linecap%3D%22round%22%20opacity%3D%220.65%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M15.8%205.1l-4.5%2013.7%22%20fill%3D%22none%22%20stroke%3D%22%235EA2FF%22%20stroke-width%3D%220.75%22%20stroke-linecap%3D%22round%22%20opacity%3D%220.6%22%2F%3E%0A%3C%2Fsvg%3E") center / contain no-repeat !important;\
}\
.lampac--button > svg path,\
.selectbox-item__icon svg[viewBox="0 0 392.697 392.697"] path {\
  opacity: 0 !important;\
}\
</style>');
   Lampa.Component.add('LampaUaNg', component); //то же самое
    resetTemplates();

    function addButton(e) {
      if (e.render.find('.lampac--button').length) return;
      var btn = $(Lampa.Lang.translate(button));
	  // //console.log(btn.clone().removeClass('focus').prop('outerHTML'))
      btn.on('hover:enter', function() {
        resetTemplates();
        Lampa.Component.add('LampaUaNg', component);
		
		var id = Lampa.Utils.hash(e.movie.number_of_seasons ? e.movie.original_name : e.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'LampaUaNg',
          search: all[id] ? all[id] : e.movie.title,
          search_one: e.movie.title,
          search_two: e.movie.original_title,
          movie: e.movie,
          page: 1,
		  clarification: all[id] ? true : false
        });
      });
      e.render.after(btn);
    }
    Lampa.Listener.follow('full', function(e) {
      if (e.type == 'complite') {
        addButton({
          render: e.object.activity.render().find('.view--torrent'),
          movie: e.data.movie
        });
      }
    });
    try {
      if (Lampa.Activity.active().component == 'full') {
        addButton({
          render: Lampa.Activity.active().activity.render().find('.view--torrent'),
          movie: Lampa.Activity.active().card
        });
      }
    } catch (e) {}
    if (Lampa.Manifest.app_digital >= 177) {
        var balansers_sync = [
            "filmix",
            "filmixtv",
            "fxapi",
            "rezka",
            "pizdatoehd",
            "getstv",
            "kinopub",
            "zetflixdb",
            "collaps",
            "hdvb",
            "kodik",
            "bamboo",
            "eneyida",
            "kinoukr",
            "uafilm",
            "uakino",
            "kinotochka",
            "remux",
            "anilibria",
            "animedia",
            "animego",
            "animevost",
            "animebesst",
            "alloha",
            "mirage",
            "phantom",
            "animelib",
            "moonanime",
            "vibix",
            "fancdn",
            "cdnvideohub",
            "vokino",
            "hydraflix",
            "videasy",
            "vidsrc",
            "movpi",
            "vidlink",
            "smashystream",
            "autoembed",
            "pidtor",
            "videoseed",
            "iptvonline",
            "veoveo",
            "kinoflix",
            "leproduction",
            "vkmovie",
            "videoseed",
            "veoveo",
            "kinogo",
            "kinobase",
            "fancdn",
            "asiage",
            "geosaitebi",
            "mikai",
            "dreamerscast"
        ];
      balansers_sync.forEach(function(name) {
        Lampa.Storage.sync('online_choice_' + name, 'object_object');
      });
      Lampa.Storage.sync('online_watched_last', 'object_object');
    }
  }

  // =============================================
  // SOURCE ORDER — інтегровано з sourceorder.js
  // Додає кнопку «Сортувати» та редактор порядку
  // =============================================
    var PLUGIN_ID = 'lampaua_source_order';
    var STORAGE_KEY = 'lampaua_source_order_v1';
    var isWindows = navigator.userAgent.toLowerCase().indexOf('windows') !== -1;
    var UA_FLAG = isWindows ? '[UA]' : '🇺🇦';
    var FALLBACK_ICON = '▶';

    var DEFAULTS = {
        makhno: { title: 'Makhno ~ 1080', icon: UA_FLAG, order: 1 },
        lme_makhno: { title: 'Makhno ~ 1080', icon: UA_FLAG, order: 1 },
        uaflix: { title: 'Uaflix ~ 1080', icon: UA_FLAG, order: 2 },
        lme_uaflix: { title: 'Uaflix ~ 1080', icon: UA_FLAG, order: 2 },
        klonfun: { title: 'KlonFUN ~ 1080', icon: UA_FLAG, order: 3 },
        lme_klonfun: { title: 'KlonFUN ~ 1080', icon: UA_FLAG, order: 3 },
        uakino: { title: 'UaKino ~ 1080', icon: UA_FLAG, order: 4 },
        lme_uakino: { title: 'UaKino ~ 1080', icon: UA_FLAG, order: 4 },
        uafilmme: { title: 'UafilmME ~ 1080', icon: UA_FLAG, order: 5 },
        lme_uafilmme: { title: 'UafilmME ~ 1080', icon: UA_FLAG, order: 5 },
        uafilm: { title: 'UAFilm ~ 1080', icon: UA_FLAG, order: 6 },
        lme_uafilm: { title: 'UAFilm ~ 1080', icon: UA_FLAG, order: 6 },
        kinoukr: { title: 'KinoUkr ~ 1080', icon: UA_FLAG, order: 7 },
        lme_kinoukr: { title: 'KinoUkr ~ 1080', icon: UA_FLAG, order: 7 },
        ashdi: { title: 'Ashdi ~ 1080', icon: UA_FLAG, order: 8 },
        lme_ashdi: { title: 'Ashdi ~ 1080', icon: UA_FLAG, order: 8 },
        eneyida: { title: 'Eneyida ~ 1080', icon: UA_FLAG, order: 9 },
        lme_eneyida: { title: 'Eneyida ~ 1080', icon: UA_FLAG, order: 9 },
        mirage: { title: 'Mirage ~ 4K', icon: '👑', order: 10 },
        lme_mirage: { title: 'Mirage ~ 4K', icon: '👑', order: 10 },
        spectre: { title: 'Spectre ~ 4K', icon: '👑', order: 11 },
        lme_spectre: { title: 'Spectre ~ 4K', icon: '👑', order: 11 },
        phantom: { title: 'Phantom ~ 4K', icon: '👑', order: 12 },
        lme_phantom: { title: 'Phantom ~ 4K', icon: '👑', order: 12 },
        jacktor: { title: 'JackTor ~ 4K', icon: '👑', order: 13 },
        lme_jacktor: { title: 'JackTor ~ 4K', icon: '👑', order: 13 },
        pidtor: { title: 'PidTor ~ 4K', icon: '👑', order: 14 },
        lme_pidtor: { title: 'PidTor ~ 4K', icon: '👑', order: 14 },
        bamboo: { title: 'Bamboo', icon: '🌸', order: 15 },
        lme_bamboo: { title: 'Bamboo', icon: '🌸', order: 15 },
        animeon: { title: 'AnimeON', icon: '🌸', order: 16 },
        lme_animeon: { title: 'AnimeON', icon: '🌸', order: 16 },
        mikai: { title: 'Mikai', icon: '🌸', order: 17 },
        lme_mikai: { title: 'Mikai', icon: '🌸', order: 17 },
        unimay: { title: 'Unimay', icon: '🌸', order: 18 },
        lme_unimay: { title: 'Unimay', icon: '🌸', order: 18 },
        moonanime: { title: 'MoonAnime', icon: '🌸', order: 19 },
        lme_moonanime: { title: 'MoonAnime', icon: '🌸', order: 19 },
        nmoonanime: { title: 'New MoonAnime', icon: '🌸', order: 20 },
        lme_nmoonanime: { title: 'New MoonAnime', icon: '🌸', order: 20 },
        aniliberty: { title: 'AniLiberty', icon: '🌸', order: 21 },
        lme_aniliberty: { title: 'AniLiberty', icon: '🌸', order: 21 },
        filmix: { title: 'Filmix [ Prem ]', icon: '🍿', order: 22 },
        lme_filmix: { title: 'Filmix [ Prem ]', icon: '🍿', order: 22 },
        rezka: { title: 'Rezka [ 720 ]', icon: '🍿', order: 23 },
        pizatoadhd: { title: 'Rezka [ 720 ]', icon: '🍿', order: 23 },
        zetflix: { title: 'Zetflix', icon: '🍿', order: 24 },
        lme_zetflix: { title: 'Zetflix', icon: '🍿', order: 24 },
        starlight: { title: 'StarLight', icon: '⭐', order: 25 },
        lme_starlight: { title: 'StarLight', icon: '⭐', order: 25 },
        streamdata: { title: 'StreamData', icon: '⭐', order: 26 },
        lme_streamdata: { title: 'StreamData', icon: '⭐', order: 26 },
        sisi: { title: 'Sisi', icon: '🍓', order: 27 }
    };

    var ICONS = [
        '', UA_FLAG, '🇺🇦', '👑', '💎', '🍿', '⭐', '🌸', '⚡', '🔥',
        '🎬', '▶', '📺', '📁', '🔎', '🎞', '🧩', '🟢', '🟡', '🔴'
    ];

    var lastTitles = {};
    var filterPatched = false;
    var editorReturnController = 'settings_component';

    var GROUP_NAMES = {
        0: 'Глядач',
        1: 'Преміум',
        2: 'Меценат',
        3: 'Преміум'
    };

    var SOURCE_GROUPS = {
        makhno: 0,
        lme_makhno: 0,
        uaflix: 0,
        lme_uaflix: 0,
        klonfun: 0,
        lme_klonfun: 0,
        lme_uakino: 0,
        lme_uafilmme: 0,
        lme_streamdata: 0,
        lme_starlight: 0,
        starlight: 0,
        streamdata: 0,
        filmix: 0,
        lme_filmix: 0,
        rezka: 0,
        pizatoadhd: 0,
        bamboo: 0,
        lme_bamboo: 0,
        animeon: 0,
        lme_animeon: 0,
        mikai: 0,
        lme_mikai: 0,
        unimay: 0,
        lme_unimay: 0,
        moonanime: 0,
        lme_moonanime: 0,
        nmoonanime: 0,
        lme_nmoonanime: 0,
        aniliberty: 0,
        lme_aniliberty: 0,
        jacktor: 2,
        lme_jacktor: 2,
        mirage: 2,
        lme_mirage: 2,
        uakino: 3,
        ashdi: 3,
        lme_ashdi: 3,
        kinoukr: 3,
        lme_kinoukr: 3,
        eneyida: 3,
        lme_eneyida: 3,
        uafilm: 3,
        lme_uafilm: 3,
        pidtor: 3,
        lme_pidtor: 3,
        spectre: 3,
        lme_spectre: 3,
        phantom: 3,
        lme_phantom: 3,
        zetflix: 1,
        lme_zetflix: 1,
        sisi: 0
    };

    function storage() {
        var value = Lampa.Storage.get(STORAGE_KEY, null);
        if (!value || typeof value !== 'object') {
            value = { order: [], items: {}, known: {} };
        }
        value.order = Array.isArray(value.order) ? value.order : [];
        value.items = value.items && typeof value.items === 'object' ? value.items : {};
        value.known = value.known && typeof value.known === 'object' ? value.known : {};
        return value;
    }

    function saveStorage(value) {
        Lampa.Storage.set(STORAGE_KEY, value);
    }

    function html(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function stripLock(title) {
        return String(title || '').replace(/\s*🔒.*$/g, '').trim();
    }

    function lockSuffix(title) {
        var match = String(title || '').match(/\s*🔒.*$/);
        return match ? match[0] : '';
    }

    function groupName(value) {
        return GROUP_NAMES[value] || GROUP_NAMES[0];
    }

    function groupFromTitle(title) {
        var suffix = lockSuffix(title);
        if (!suffix) return null;

        if (suffix.indexOf('Меценат') >= 0) return 'Меценат';
        if (suffix.indexOf('Преміум') >= 0) return 'Преміум';
        if (suffix.indexOf('Глядач') >= 0) return 'Глядач';

        return null;
    }

    function sourceGroupTitle(key, originalTitle) {
        return groupFromTitle(originalTitle) || groupName(SOURCE_GROUPS[key] == null ? 0 : SOURCE_GROUPS[key]);
    }

    function defaultTitle(key, fallback) {
        if (DEFAULTS[key]) return DEFAULTS[key].title;
        return stripLock(fallback || key);
    }

    function defaultIcon(key) {
        return DEFAULTS[key] ? DEFAULTS[key].icon : FALLBACK_ICON;
    }

    function defaultOrder(key) {
        return DEFAULTS[key] ? DEFAULTS[key].order : 10000;
    }

    function sortByDefaultOrder(keys) {
        return keys.slice().sort(function (a, b) {
            var ao = defaultOrder(a);
            var bo = defaultOrder(b);
            if (ao !== bo) return ao - bo;

            var at = defaultTitle(a, a).toLowerCase();
            var bt = defaultTitle(b, b).toLowerCase();
            if (at !== bt) return at.localeCompare(bt);

            return a.localeCompare(b);
        });
    }

    function ensureOrder(config, keys) {
        var seen = {};
        var next = [];

        config.order.forEach(function (key) {
            if (keys.indexOf(key) !== -1 && !seen[key]) {
                next.push(key);
                seen[key] = true;
            }
        });

        keys.slice().sort(function (a, b) {
            var ao = defaultOrder(a);
            var bo = defaultOrder(b);
            if (ao !== bo) return ao - bo;
            return a.localeCompare(b);
        }).forEach(function (key) {
            if (!seen[key]) {
                next.push(key);
                seen[key] = true;
            }
        });

        config.order = next;
    }

    function mergeOrder(config, keys) {
        var map = {};

        (config.order || []).forEach(function (key) { map[key] = true; });
        (keys || []).forEach(function (key) { if (key) map[key] = true; });

        ensureOrder(config, Object.keys(map));
    }

    function registerSources(items) {
        var config = storage();
        var keys = [];
        var changed = false;

        items.forEach(function (item) {
            var key = item && item.source;
            if (!key) return;

            keys.push(key);
            lastTitles[stripLock(item.title)] = key;
            lastTitles[item.title] = key;

            if (!config.known[key]) {
                config.known[key] = stripLock(item.title || key);
                changed = true;
            }
        });

        if (keys.length) {
            mergeOrder(config, keys);
            changed = true;
        }

        if (changed) saveStorage(config);
    }

    function sourceKeys(config) {
        var map = {};
        Object.keys(config.known || {}).forEach(function (key) { map[key] = true; });

        if (!Object.keys(map).length) {
            Object.keys(DEFAULTS).forEach(function (key) {
                if (key.indexOf('lme_') !== 0 && key !== 'pizatoadhd') map[key] = true;
            });
        }

        ensureOrder(config, Object.keys(map));
        return config.order.slice();
    }

    function defaultProfileConfig() {
        var current = storage();
        var known = current.known || {};
        var keys = Object.keys(known);

        if (!keys.length) {
            keys = Object.keys(DEFAULTS).filter(function (key) {
                return key.indexOf('lme_') !== 0 && key !== 'pizatoadhd';
            });
        }

        var next = {
            order: sortByDefaultOrder(keys),
            items: {},
            known: known
        };
        return next;
    }

    function customTitle(key, original) {
        var config = storage();
        var item = config.items[key] || {};
        var title = item.title || defaultTitle(key, config.known[key] || original);
        var icon = typeof item.icon === 'string' ? item.icon : defaultIcon(key);
        var suffix = lockSuffix(original);

        lastTitles[title] = key;
        lastTitles[(icon ? icon + ' ' : '') + title] = key;

        return (icon ? icon + ' ' : '') + title + suffix;
    }

    function applyToSortItems(items) {
        if (!items || !items.some(function (item) { return item && item.source; })) return items;

        registerSources(items);

        var config = storage();
        var position = {};
        mergeOrder(config, items.map(function (item) { return item.source; }).filter(Boolean));
        config.order.forEach(function (key, index) { position[key] = index; });

        items.forEach(function (item) {
            if (!item || !item.source) return;
            var originalTitle = item.title;
            item.subtitle = sourceGroupTitle(item.source, originalTitle);
            item.title = customTitle(item.source, item.title);
            item._lampaua_source_order = position[item.source] == null ? 99999 : position[item.source];
        });

        items.sort(function (a, b) {
            var ag = a && a.ghost ? 1 : 0;
            var bg = b && b.ghost ? 1 : 0;
            if (ag !== bg) return ag - bg;

            var ao = a && a._lampaua_source_order != null ? a._lampaua_source_order : 99999;
            var bo = b && b._lampaua_source_order != null ? b._lampaua_source_order : 99999;
            if (ao !== bo) return ao - bo;

            return String(a.title || '').localeCompare(String(b.title || ''));
        });

        saveStorage(config);
        return items;
    }

    function chosenTitle(title) {
        var key = lastTitles[title] || lastTitles[stripLock(title)];
        if (!key) {
            var normalized = stripLock(title).toLowerCase();
            Object.keys(DEFAULTS).some(function (candidate) {
                var data = DEFAULTS[candidate];
                if (normalized.indexOf(candidate) !== -1 || normalized.indexOf(data.title.toLowerCase()) !== -1) {
                    key = candidate;
                    return true;
                }
                return false;
            });
        }
        return key ? customTitle(key, title) : title;
    }

    function patchFilter() {
        if (filterPatched) return;
        if (!window.Lampa || !Lampa.Filter) {
            setTimeout(patchFilter, 300);
            return;
        }
        filterPatched = true;

        var OriginalFilter = Lampa.Filter;

        Lampa.Filter = function (object) {
            var filter = new OriginalFilter(object);
            var originalSet = filter.set;
            var originalChosen = filter.chosen;

            filter.set = function (type, items) {
                if (type === 'sort' && Array.isArray(items)) {
                    items = applyToSortItems(items);
                    return originalSet.call(this, type, items);
                }
                return originalSet.apply(this, arguments);
            };

            filter.chosen = function (type, selected) {
                if (type === 'sort' && Array.isArray(selected)) {
                    selected = selected.map(chosenTitle);
                    return originalChosen.call(this, type, selected);
                }
                return originalChosen.apply(this, arguments);
            };

            return filter;
        };

        Object.keys(OriginalFilter).forEach(function (key) {
            Lampa.Filter[key] = OriginalFilter[key];
        });
        Lampa.Filter.prototype = OriginalFilter.prototype;
    }

    function saveOrderFromDom(list) {
        var config = storage();
        config.order = [];
        list.find('.source-order-item').each(function () {
            config.order.push($(this).attr('data-key'));
        });
        saveStorage(config);
    }

    function updateRow(row, key) {
        var config = storage();
        var item = config.items[key] || {};
        var title = item.title || defaultTitle(key, config.known[key]);
        var icon = typeof item.icon === 'string' ? item.icon : defaultIcon(key);

        row.find('.source-order-icon')
            .text(icon || ' ')
            .toggleClass('source-order-icon--text', icon && icon.length > 2);
        row.find('.source-order-name').text(title);
        row.find('.source-order-key').text(sourceGroupTitle(key, config.known[key]));
    }

    function reopenEditorSoon() {
        setTimeout(function () {
            openEditor({ returnController: editorReturnController });
        }, 120);
    }

    function closeEditorForOverlay(row) {
        if (row && row.length) saveOrderFromDom(row.parent());
        Lampa.Modal.close();
    }

    function editName(key, row) {
        var config = storage();
        var item = config.items[key] || {};
        var value = item.title || defaultTitle(key, config.known[key]);

        closeEditorForOverlay(row);

        setTimeout(function () {
            Lampa.Input.edit({
                title: 'Назва джерела',
                value: value,
                free: true
            }, function (next) {
                if (next !== undefined) {
                    next = String(next || '').trim();

                    config = storage();
                    config.items[key] = config.items[key] || {};
                    if (next && next !== defaultTitle(key, config.known[key])) config.items[key].title = next;
                    else delete config.items[key].title;
                    saveStorage(config);
                }

                reopenEditorSoon();
            });
        }, 120);
    }

    function editIcon(key, row) {
        var config = storage();
        var current = config.items[key] && typeof config.items[key].icon === 'string' ? config.items[key].icon : defaultIcon(key);
        var items = ICONS.map(function (icon) {
            return {
                title: icon || 'Без іконки',
                icon: icon,
                selected: icon === current
            };
        });

        items.push({ title: 'Своя іконка / текст', custom: true });

        closeEditorForOverlay(row);

        setTimeout(function () {
            Lampa.Select.show({
                title: 'Іконка джерела',
                items: items,
                onBack: function () {
                    reopenEditorSoon();
                },
                onSelect: function (item) {
                    if (item.custom) {
                        setTimeout(function () {
                            Lampa.Input.edit({
                                title: 'Іконка або короткий текст',
                                value: current || '',
                                free: true
                            }, function (value) {
                                if (value !== undefined) {
                                    setIcon(key, String(value || '').trim());
                                }
                                reopenEditorSoon();
                            });
                        }, 120);
                        return;
                    }

                    setIcon(key, item.icon);
                    reopenEditorSoon();
                }
            });
        }, 120);
    }

    function setIcon(key, icon, row) {
        var config = storage();
        config.items[key] = config.items[key] || {};
        if (icon !== defaultIcon(key)) config.items[key].icon = icon;
        else delete config.items[key].icon;
        saveStorage(config);
        if (row && row.length) updateRow(row, key);
    }

    function resetSource(key, row) {
        var config = storage();
        delete config.items[key];
        saveStorage(config);
        updateRow(row, key);
    }

    function buildRow(key) {
        var row = $(
            '<div class="menu-edit-list__item source-order-item" data-key="' + html(key) + '">' +
                '<div class="source-order-main selector">' +
                    '<div class="menu-edit-list__icon source-order-icon"></div>' +
                    '<div class="source-order-text">' +
                        '<div class="menu-edit-list__title source-order-name"></div>' +
                        '<div class="source-order-key"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="source-order-actions">' +
                    '<div class="menu-edit-list__move source-order-action selector" data-action="name" title="Назва">✎</div>' +
                    '<div class="menu-edit-list__move source-order-action selector" data-action="icon" title="Іконка">□</div>' +
                    '<div class="menu-edit-list__move source-order-action selector" data-action="up" title="Вище"><svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12L11 3L20 12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg></div>' +
                    '<div class="menu-edit-list__move source-order-action selector" data-action="down" title="Нижче"><svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L11 11L20 2" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg></div>' +
                    '<div class="menu-edit-list__move source-order-action selector" data-action="reset" title="Скинути">↺</div>' +
                '</div>' +
            '</div>'
        );

        updateRow(row, key);

        row.find('.source-order-main').on('hover:enter', function () {
            editName(key, row);
        });

        row.find('.source-order-action').on('hover:enter', function () {
            var action = $(this).attr('data-action');
            var list = row.parent();

            if (action === 'name') editName(key, row);
            if (action === 'icon') editIcon(key, row);
            if (action === 'reset') resetSource(key, row);
            if (action === 'up') {
                var prev = row.prev('.source-order-item');
                if (prev.length) {
                    row.insertBefore(prev);
                    saveOrderFromDom(list);
                }
            }
            if (action === 'down') {
                var next = row.next('.source-order-item');
                if (next.length) {
                    row.insertAfter(next);
                    saveOrderFromDom(list);
                }
            }
        });

        return row;
    }

    function closeEditor(list) {
        if (list && list.length) saveOrderFromDom(list);
        Lampa.Modal.close();
        if (editorReturnController && Lampa.Controller) {
            Lampa.Controller.toggle(editorReturnController);
        }
    }

    function openEditor(options) {
        options = options || {};
        editorReturnController = options.returnController || editorReturnController || 'settings_component';

        var config = storage();
        var keys = sourceKeys(config);
        saveStorage(config);

        var wrap = $('<div class="source-order-wrap"></div>');
        var list = $('<div class="menu-edit-list source-order-list"></div>');

        keys.forEach(function (key) {
            list.append(buildRow(key));
        });

        var reset = $('<div class="source-order-reset selector">Скинути за замовчуванням</div>');

        reset.on('hover:enter', function () {
            Lampa.Storage.set(STORAGE_KEY, defaultProfileConfig());
            Lampa.Noty.show('Порядок джерел скинуто');
            Lampa.Modal.close();
            openEditor({ returnController: editorReturnController });
        });

        wrap.append(list);
        wrap.append(reset);

        Lampa.Modal.open({
            title: 'Редагувати джерела',
            html: wrap,
            size: 'small',
            scroll_to_center: true,
            onBack: function () {
                closeEditor(list);
            }
        });
    }

    function openFromContent() {
        openEditor({ returnController: 'content' });
    }

    function addFilterButton(root) {
        var scope = root ? $(root) : $(document);
        var filters = scope.is && scope.is('.torrent-filter')
            ? scope
            : scope.find('.torrent-filter');

        filters.each(function () {
            var filter = $(this);
            if (filter.find('.source-order-filter-button').length) return;

            var sort = filter.find('.filter--sort').first();
            var filterButton = filter.find('.filter--filter').first();
            if (!sort.length || !filterButton.length) return;

            var button = $('<div class="simple-button simple-button--filter selector source-order-filter-button"><span>Сортувати</span></div>');
            button.on('hover:enter', openFromContent);
            button.insertAfter(sort);
        });
    }

    function observeUi() {
        addFilterButton(document);

        var attempts = 0;
        var retry = setInterval(function () {
            attempts++;
            addFilterButton(document);
            if (attempts > 40) clearInterval(retry);
        }, 500);

        if (window.lampaua_source_order_observer || typeof MutationObserver === 'undefined') return;
        window.lampaua_source_order_observer = true;

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                for (var i = 0; i < mutation.addedNodes.length; i++) {
                    var node = mutation.addedNodes[i];
                    if (!node || node.nodeType !== 1) continue;
                    addFilterButton(node);
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function addStyle() {
        if (document.getElementById('lampaua-source-order-style')) return;

        var style = document.createElement('style');
        style.id = 'lampaua-source-order-style';
        style.innerHTML = [
            '.source-order-wrap{width:100%;max-width:31em;margin:0 auto;box-sizing:border-box;}',
            '.source-order-list{padding-right:0;margin-right:0;}',
            '.source-order-item{display:flex;align-items:center;padding:.34em .45em;border-radius:.3em;}',
            '.source-order-item:nth-child(even){background:rgba(255,255,255,.1);}',
            '.source-order-main{display:flex;align-items:center;min-width:0;flex:1;border-radius:.3em;}',
            '.source-order-main.focus{background:rgba(255,255,255,.12);}',
            '.source-order-icon{font-size:1.15em;text-align:center;white-space:nowrap;overflow:hidden;}',
            '.source-order-icon--text{font-size:.72em!important;letter-spacing:0;}',
            '.source-order-icon:not(:empty){background:rgba(255,255,255,.08);}',
            '.source-order-icon:empty:before{content:"";}',
            '.source-order-icon{font-weight:700;}',
            '.source-order-icon{font-size:clamp(.72em,1.15em,1.15em);}',
            '.source-order-text{min-width:0;flex:1;}',
            '.source-order-name{font-size:1.18em;font-weight:300;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.source-order-key{font-size:.68em;line-height:1.15;opacity:.42;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.source-order-actions{display:flex;align-items:center;gap:.05em;margin-left:.45em;flex-shrink:0;}',
            '.source-order-action{background:transparent;font-size:1.02em;}',
            '.source-order-action svg{width:1em!important;height:1em!important;}',
            '.source-order-action.focus{background:#fff!important;color:#000!important;border-radius:.3em;}',
            '.source-order-reset{text-align:center;margin-top:.75em;border-radius:.3em;padding:.82em 1em;font-weight:700;}',
            '.source-order-reset{background:rgba(160,70,70,.45);}',
            '.source-order-reset.focus{outline:.16em solid rgba(255,255,255,.85);outline-offset:.08em;}',
            '.source-order-filter-button{margin-left:.7em;}',
            '@media(max-width:600px){.source-order-wrap{max-width:100%;}.source-order-name{font-size:1.05em;}.source-order-actions{margin-left:.25em;}.source-order-action{width:2em;height:2em;}}'
        ].join('');
        document.head.appendChild(style);
    }

    function init() {
        if (!window.Lampa || !window.$) {
            setTimeout(init, 300);
            return;
        }

        addStyle();
        patchFilter();
        observeUi();

        window.LampaUaSourceOrder = {
            open: openEditor,
            config: storage,
            reset: function () {
                Lampa.Storage.set(STORAGE_KEY, defaultProfileConfig());
            }
        };
    }

    init();

  if (!window.LampaUaNg_plugin) startPlugin();

})();
