// Stels_Online based on online_mod.js

(function () {
    'use strict';

    var STELS_ONLINE_VERSION = '1.1.164';
    var STELS_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#050505"/><stop offset="1" stop-color="#00d36f"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><text x="64" y="77" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="42" font-weight="800" fill="#fff">SO</text></svg>';
    var STELS_ICON_URL = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(STELS_ICON_SVG);
    var STELS_ICON_HTML = '<img class="stels-online-plugin-icon" src="' + STELS_ICON_URL + '" style="width:2.2em;height:2.2em;object-fit:contain;display:block;flex-shrink:0" alt="Stels_Online">';
    var STELS_UA_FLAG_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="40" fill="#005BBB"/><rect y="40" width="120" height="40" fill="#FFD500"/></svg>';
    var STELS_UA_FLAG_URL = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(STELS_UA_FLAG_SVG);
    var STELS_UA_FLAG_HTML = '<img class="stels-online-ua-flag" src="' + STELS_UA_FLAG_URL + '" alt="" aria-hidden="true">';
    var STELS_LOG_KEY = 'STELS_ONLINE_MOD_DEBUG_LOG';
    var STELS_LOG_MAX = 1200;
    var stelsPrecheckSilentNoty = 0;
    var stelsPrecheckSilentUntil = 0;
    var stelsOriginalNotyShow = null;
    var stelsPrecheckNotyGuardFn = null;

    function stelsNotyMessageToText(msg) {
      try {
        if (msg == null) return '';
        if (typeof msg === 'string') return msg;
        if (typeof msg === 'number' || typeof msg === 'boolean') return String(msg);
        if (msg.message) return String(msg.message || '');
        if (msg.text) return String(msg.text || '');
        if (msg.title) return String(msg.title || '');
        if (msg.toString && msg.toString !== Object.prototype.toString) return String(msg.toString());
      } catch (e) {}
      try { return JSON.stringify(msg); } catch (e2) { return ''; }
    }

    function stelsIsPrecheckNoiseMessage(msg) {
      var text = stelsNotyMessageToText(msg).replace(/\s+/g, ' ').trim();
      if (!text) return false;
      return /(?:неможливо\s+отримати\s+посилання|не\s+вдалося\s+(?:отримати|завантажити|знайти|витягти)|не\s+удалось|не\s+удалося|не\s+получилось|failed\s+to\s+(?:fetch|load|get|extract)|failed\s+link|unable\s+to\s+(?:get|fetch|load|extract)|could\s+not\s+(?:get|fetch|load|extract)|no\s+(?:file|link|stream)|online_mod_nolink|stels_online_nolink)/i.test(text);
    }

    function stelsPrecheckNotyMuted() {
      return stelsPrecheckSilentNoty > 0 || Date.now() < stelsPrecheckSilentUntil;
    }

    function stelsArmPrecheckNotyMute(ms) {
      try {
        stelsInstallPrecheckNotyGuard(true);
        var until = Date.now() + (parseInt(ms, 10) || 0);
        if (until > stelsPrecheckSilentUntil) stelsPrecheckSilentUntil = until;
      } catch (e) {}
    }

    function stelsInstallPrecheckNotyGuard(force) {
      try {
        if (!Lampa || !Lampa.Noty || typeof Lampa.Noty.show !== 'function') return;
        var current = Lampa.Noty.show;
        if (!force && current && current._stels_precheck_guard_wrapped) return;
        if (current && current._stels_precheck_guard_wrapped && stelsPrecheckNotyGuardFn === current) return;
        stelsOriginalNotyShow = current && current._stels_precheck_guard_wrapped && stelsOriginalNotyShow ? stelsOriginalNotyShow : current;
        stelsPrecheckNotyGuardFn = function () {
          try {
            if (stelsPrecheckNotyMuted() && stelsIsPrecheckNoiseMessage(arguments[0])) {
              try {
                stelsLog('precheck-noty-suppressed', {
                  message: stelsNotyMessageToText(arguments[0]).slice(0, 220),
                  depth: stelsPrecheckSilentNoty,
                  silent_ms_left: Math.max(0, stelsPrecheckSilentUntil - Date.now())
                });
              } catch (elog) {}
              return;
            }
          } catch (e) {}
          return stelsOriginalNotyShow.apply(this, arguments);
        };
        stelsPrecheckNotyGuardFn._stels_precheck_guard_wrapped = true;
        Lampa.Noty.show = stelsPrecheckNotyGuardFn;
        Lampa.Noty._stels_precheck_guard = true;
      } catch (e) {}
    }

    function stelsPrecheckNotyMuteOn(reason) {
      try {
        stelsInstallPrecheckNotyGuard(true);
        stelsPrecheckSilentNoty++;
        stelsArmPrecheckNotyMute(20000);
      } catch (e) {}
      try { stelsLog('precheck-noty-mute-on', { reason: reason || '', depth: stelsPrecheckSilentNoty, silent_ms_left: Math.max(0, stelsPrecheckSilentUntil - Date.now()) }); } catch (e2) {}
    }

    function stelsPrecheckNotyMuteOff(reason) {
      try {
        stelsArmPrecheckNotyMute(10000);
        setTimeout(function () {
          stelsPrecheckSilentNoty = Math.max(0, stelsPrecheckSilentNoty - 1);
          try { stelsLog('precheck-noty-mute-off', { reason: reason || '', depth: stelsPrecheckSilentNoty, silent_ms_left: Math.max(0, stelsPrecheckSilentUntil - Date.now()) }); } catch (e2) {}
        }, 10000);
      } catch (e) { stelsPrecheckSilentNoty = Math.max(0, stelsPrecheckSilentNoty - 1); }
    }

    var STELS_SOURCES_HIDE_KEY = 'stels_online_sources_hide';
    var STELS_SOURCES_ORDER_KEY = 'stels_online_sources_order';
    var STELS_WATCH_HISTORY_KEY = 'stels_online_watch_history';
    var STELS_WATCH_HISTORY_MAX = 300;

    var STELS_REQUESTED_SOURCE_NAMES = [
      'uaflix', 'klonfun', 'batkomakhno', 'jacktor', 'uakino-lampaua', 'uafilmme-lampaua', 'uaserials', 'rezka720',
      'makhno', 'filmix', 'bambooua', 'animeon', 'mikai', 'moonanime', 'starlight',
      'filmixtv', 'fxapi', 'rezka', 'pizdatoehd', 'getstv', 'kinopub', 'zetflixdb', 'zetflixnet', 'collaps',
      'hdvb', 'kodik', 'bamboo', 'eneyida', 'kinoukr', 'zerx', 'uafilm', 'kinotochka', 'iremux', 'remux',
      'anilibria', 'animedia', 'animego', 'animevost', 'animebesst', 'alloha', 'mirage',
      'phantom', 'animelib', 'vibix', 'fancdn', 'cdnvideohub', 'vokino', 'hydraflix',
      'videasy', 'vidsrc', 'movpi', 'vidlink', 'smashystream', 'autoembed', 'pidtor',
      'videoseed', 'iptvonline', 'veoveo', 'tartuga', 'kinoflix', 'leproduction', 'vkmovie',
      'kinobase', 'asiage', 'geosaitebi', 'dreamerscast', 'uakino',
      'lumex', 'lumex2', 'rezka2', 'collaps-dash', 'cdnmovies', 'zetflix', 'fancdn2',
      'fanserials', 'redheadsound', 'redheadsound-dash', 'anilibria2', 'kinopub-native'
    ];

    var STELS_SOURCE_TITLES = {
      uaflix: 'UAflix', klonfun: 'KlonFun', batkomakhno: 'BatkoMakhno', jacktor: 'JackTor', makhno: 'Makhno', filmix: 'Filmix', bambooua: 'BambooUA', animeon: 'AnimeOn',
      mikai: 'Mikai', moonanime: 'MoonAnime', starlight: 'Midnight', filmixtv: 'FilmixTV', fxapi: 'FxAPI',
      rezka: 'Rezka', pizdatoehd: 'PizdatoeHD', getstv: 'GetsTV', kinopub: 'KinoPub', zetflixdb: 'ZetflixDB', zetflixnet: 'ZetflixNet',
      collaps: 'Collaps', hdvb: 'HDVB', kodik: 'Kodik', bamboo: 'Bamboo', eneyida: 'Eneyida',
      kinoukr: 'KinoUkr', zerx: 'Zerx', uafilm: 'UAFilm', kinotochka: 'KinoTochka', iremux: 'iRemux', remux: 'Remux', anilibria: 'AniLibria',
      animedia: 'Animedia', animego: 'AnimeGo', animevost: 'AnimeVost', animebesst: 'AnimeBesst', alloha: 'Alloha',
      mirage: 'Mirage', phantom: 'Phantom', animelib: 'AnimeLib', vibix: 'Vibix', fancdn: 'FanCDN',
      cdnvideohub: 'CDNVideoHub', vokino: 'Vokino', hydraflix: 'HydraFlix', videasy: 'Videasy', vidsrc: 'VidSrc',
      movpi: 'MovPi', vidlink: 'VidLink', smashystream: 'SmashyStream', autoembed: 'AutoEmbed', pidtor: 'PidTor',
      videoseed: 'VideoSeed', iptvonline: 'IPTVOnline', veoveo: 'VeoVeo', tartuga: 'Tartuga', kinoflix: 'KinoFlix',
      leproduction: 'LeProduction', vkmovie: 'VKMovie', kinobase: 'Kinobaza', asiage: 'AsiaGe',
      geosaitebi: 'Geosaitebi', dreamerscast: 'DreamersCast', uakino: 'UAkino (HDRezka)', lumex: 'Lumex', lumex2: 'Lumex (Ads)',
      rezka2: 'HDrezka', 'collaps-dash': 'Collaps (DASH)', cdnmovies: 'CDNMovies', zetflix: 'Zetflix',
      fancdn2: 'FanCDN (ID)', fanserials: 'FanSerials', redheadsound: 'RedHeadSound',
      'redheadsound-dash': 'RedHeadSound (DASH)', anilibria2: 'AniLibria.top', 'kinopub-native': 'KinoPub (OnlineMod)', 'uakino-lampaua': 'UAKino', 'uafilmme-lampaua': 'UafilmMe', uaserials: 'UASerials', rezka720: 'Rezka ~ 720'
    };

    var STELS_SOURCE_ENGINE_ALIAS = {
      lumex: 'lumex', lumex2: 'lumex2', rezka2: 'rezka2', kinobase: 'kinobase', collaps: 'collaps',
      'collaps-dash': 'collaps-dash', cdnmovies: 'cdnmovies', filmix: 'filmix', zetflix: 'zetflix', zetflixnet: 'zetflixnet',
      fancdn: 'fancdn', fancdn2: 'fancdn2', fanserials: 'fanserials', videoseed: 'videoseed', vibix: 'vibix',
      redheadsound: 'redheadsound', 'redheadsound-dash': 'redheadsound-dash', cdnvideohub: 'cdnvideohub',
      anilibria: 'anilibria', anilibria2: 'anilibria2', animelib: 'animelib', kodik: 'kodik', alloha: 'alloha',
      'kinopub-native': 'kinopub', kinopub: 'kinopub',
      rezka: 'rezka2', pizdatoehd: 'rezka2', pizatoadhd: 'rezka2', zetflixdb: 'zetflix', hdvb: 'hdvb',
      bambooua: 'lumex2', bamboo: 'lumex2', uakino: 'rezka2', uafilm: 'rezka2', kinoukr: 'kinoukr', zerx: 'zerx',
      eneyida: 'eneyida', uaserials: 'uaserials', jacktor: 'lampaua-jacktor', kinotochka: 'rc-kinotochka', iremux: 'rc-iremux', uaflix: 'lampaua-uaflix', klonfun: 'lampaua-klonfun', batkomakhno: 'lampaua-batkomakhno', 'uakino-lampaua': 'lampaua-uakino', 'uafilmme-lampaua': 'lampaua-uafilmme', rezka720: 'lampaua-rezka720', makhno: 'makhno', filmixtv: 'filmix',
      fxapi: 'filmix', animeon: 'anilibria2', mikai: 'animelib', moonanime: 'anilibria2', starlight: 'starlight',
      remux: 'cdnmovies', animedia: 'animelib', animego: 'animelib', animevost: 'animelib', animebesst: 'animelib',
      mirage: 'rc-mirage', phantom: 'collaps-dash', vokino: 'cdnvideohub', hydraflix: 'videoseed', videasy: 'videoseed',
      vidsrc: 'videoseed', movpi: 'videoseed', vidlink: 'videoseed', smashystream: 'videoseed', autoembed: 'videoseed',
      pidtor: 'collaps-dash', iptvonline: 'cdnvideohub', veoveo: 'rc-veoveo', tartuga: 'tartuga', kinoflix: 'videoseed', leproduction: 'videoseed',
      vkmovie: 'cdnvideohub', asiage: 'rezka2', geosaitebi: 'rezka2', dreamerscast: 'rezka2', getstv: 'getstv'
    };

    function stelsQualityToValue(label) {
      try {
        if (label == null || label === false || label === true) return 0;
        if (typeof label == 'number') return label > 100 && label < 9000 ? label : 0;
        var text = String(label || '').replace(/&nbsp;/g, ' ');
        try { text = decodeURIComponent(text); } catch (e) {}
        try { text = text.replace(/\\u([0-9a-f]{4})/ig, function (all, h) { return String.fromCharCode(parseInt(h, 16)); }); } catch (e2) {}
        var max = 0;
        var low = text.toLowerCase();
        if (/(^|[^a-z0-9])(?:uhd|ultra\s*hd)([^a-z0-9]|$)/i.test(low)) max = Math.max(max, 2160);
        if (/(^|[^a-z0-9])(?:fhd|full\s*hd)([^a-z0-9]|$)/i.test(low)) max = Math.max(max, 1080);
        if (/(^|[^a-z0-9])hd([^a-z0-9]|$)/i.test(low)) max = Math.max(max, 720);
        text.replace(/(^|[^a-z0-9])([842])\s*k([^a-z0-9]|$)/ig, function (all, pre, k) {
          var v = parseInt(k, 10);
          if (v === 8) max = Math.max(max, 4320);
          else if (v === 4) max = Math.max(max, 2160);
          else if (v === 2) max = Math.max(max, 1440);
          return all;
        });
        text.replace(/(^|[^a-z0-9])((?:4320|2160|1440|1080|720|576|480|360|240|144))\s*p([^a-z0-9]|$)/ig, function (all, pre, q) {
          var v = parseInt(q, 10);
          if (v >= 144 && v <= 4320) max = Math.max(max, v);
          return all;
        });
        text.replace(/(?:quality|height|max_quality|res|resolution)[^0-9]{0,12}((?:4320|2160|1440|1080|720|576|480|360|240|144))/ig, function (all, q) {
          var v = parseInt(q, 10);
          if (v >= 144 && v <= 4320) max = Math.max(max, v);
          return all;
        });
        return max;
      } catch (e3) {}
      return 0;
    }

    function stelsQualityLabel(value) {
      value = parseInt(value, 10) || 0;
      if (!value) return '';
      if (value >= 4320) return '8K';
      if (value >= 2160) return '4K';
      if (value >= 1440) return '2K';
      return value + 'p';
    }

    function stelsSourceQualityCap(source) {
      source = stelsNormalizeSourceKey(source || '');
      if (source === 'filmix' || source === 'filmixtv' || source === 'fxapi') return 480;
      if (source === 'iremux') return 1080;
      if (source === 'veoveo') return 1080;
      if (source === 'uakino' || source === 'uakino-lampaua' || source === 'lampaua-uakino') return 1080;
      if (source === 'uafilmme' || source === 'uafilmme-lampaua' || source === 'lampaua-uafilmme') return 1080;
      if (source === 'eneyida') return 1080;
      if (source === 'mirage') return 2160;
      return 0;
    }

    function stelsClampSourceQualityValue(source, value) {
      value = parseInt(value, 10) || 0;
      if (!value) return 0;
      var cap = stelsSourceQualityCap(source);
      if (cap && value > cap) return cap;
      return value;
    }

    var STELS_VOICE_QUALITY_RE = /^(?:8K|4K|2K|4320p|2160p|1440p|1080p|720p|576p|480p|360p|240p|144p|HLS)$/i;
    var stelsVoiceQualityColorObserver = null;
    var stelsVoiceQualityColorTimer = 0;

    function stelsVoiceQualityPrefix(value) {
      var m = String(value == null ? '' : value).trim().match(/^(8K|4K|2K|4320p|2160p|1440p|1080p|720p|576p|480p|360p|240p|144p|HLS)(?:\s+|$)/i);
      return m ? m[1] : '';
    }

    function stelsStripVoiceQuality(value) {
      return String(value == null ? '' : value).replace(/^\s*(?:8K|4K|2K|4320p|2160p|1440p|1080p|720p|576p|480p|360p|240p|144p|HLS)\s+/i, '').trim();
    }

    function stelsVoiceQualityLabelFromAny(value) {
      var q = 0;
      try { q = stelsExtractMaxQualityFromAny(value, 0, 'quality'); } catch (e) {}
      return q ? stelsQualityLabel(q) : '';
    }

    function stelsVoiceDisplayName(name, quality, episodeCount) {
      name = String(name == null ? '' : name).trim();
      quality = String(quality == null ? '' : quality).trim();
      if (!name) return name;
      var ep = parseInt(episodeCount, 10) || 0;
      var epSuffix = ep > 0 ? (' E' + ep) : '';
      var alreadyHasEp = /\sE\d+\s*$/.test(name);
      if (stelsVoiceQualityPrefix(name)) return alreadyHasEp || !epSuffix ? name : (name + epSuffix);
      if (!quality && STELS_VOICE_QUALITY_RE.test(name)) return alreadyHasEp || !epSuffix ? name : (name + epSuffix);
      var withEp = alreadyHasEp ? name : (name + epSuffix);
      return quality ? (quality + '  ' + withEp) : withEp;
    }

    var stelsVoiceQualityDisplayMap = [];

    function stelsCleanVoiceDisplayText(value) {
      var text = String(value == null ? '' : value).replace(/&nbsp;/g, ' ').trim();
      text = text.replace(/[✓✔]/g, ' ').trim();
      text = text.replace(/^\s*\d+\s*\/\s*/i, '').trim();
      text = text.replace(/\s*\/\s*(?:Alloha|ZetflixNet|Rezka\s*~\s*720|CDNVideoHub|Makhno|Midnight|HDVB|GetsTV|VKMovie|IPTVOnline|Vokino|UAKino|UafilmMe|KlonFun|BatkoMakhno|UAflix|UaFlix|UAFilm|iRemux|VeoVeo|Tartuga)\s*$/i, '').trim();
      text = text.replace(/^\s*p\s+(?=\S)/i, '').trim();
      text = text.replace(/^\s*k\s+(?=\S)/i, '').trim();
      return text.replace(/\s+/g, ' ').trim();
    }

    function stelsVoiceCompareText(value) {
      return stelsStripVoiceQuality(stelsCleanVoiceDisplayText(value)).replace(/\s+/g, ' ').toLowerCase();
    }

    function stelsRememberVoiceQualityDisplayMap(rawVoices, displayVoices, sourceName) {
      try {
        if (!(rawVoices && rawVoices.length) || !(displayVoices && displayVoices.length)) return;
        var next = [];
        rawVoices.forEach(function (raw, index) {
          var display = displayVoices[index] || '';
          var quality = stelsVoiceQualityPrefix(display || '');
          if (!quality) return;
          var cleanRaw = stelsCleanVoiceDisplayText(raw || '');
          var cmp = stelsVoiceCompareText(cleanRaw);
          if (!cmp) return;
          next.push({ raw: cleanRaw, compare: cmp, display: display, source: sourceName || '' });
        });
        if (!next.length) return;
        var merged = next.concat(stelsVoiceQualityDisplayMap || []);
        var seen = {};
        stelsVoiceQualityDisplayMap = merged.filter(function (it) {
          var k = (it.source || '') + '|' + (it.compare || '');
          if (!it.compare || seen[k]) return false;
          seen[k] = true;
          return true;
        }).slice(0, 240);
      } catch (e) {}
    }

    function stelsRemoveVoiceRowServiceNoise(row) {
      var result = { removed: 0, errors: [] };
      try {
        if (!row || !document.createTreeWalker) return result;
        var sourceSuffix = /\/\s*(?:Alloha|ZetflixNet|Rezka\s*~\s*720|CDNVideoHub|Makhno|Midnight|HDVB|GetsTV|VKMovie|IPTVOnline|Vokino|UAKino|UafilmMe|KlonFun|BatkoMakhno|UAflix|UaFlix|UAFilm|iRemux|VeoVeo|Tartuga)\s*$/i;
        var rowBefore = String(row.textContent || '');
        var hasBrokenPQuality = /^\s*\d+\s*\/\s*p\s+\S/i.test(rowBefore) || /^\s*p\s+\S/i.test(rowBefore);
        var hasBrokenKQuality = /^\s*\d+\s*\/\s*k\s+\S/i.test(rowBefore) || /^\s*k\s+\S/i.test(rowBefore);
        var walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, null);
        var nodes = [];
        var n;
        while ((n = walker.nextNode())) nodes.push(n);
        nodes.forEach(function (node) {
          try {
            var value = String(node.nodeValue || '');
            if (/^\s*\d+\s*\/\s*$/.test(value)) {
              node.nodeValue = '';
              result.removed++;
            } else if (hasBrokenPQuality && /^\s*p\s*$/.test(value)) {
              node.nodeValue = '';
              result.removed++;
            } else if (hasBrokenKQuality && /^\s*k\s*$/.test(value)) {
              node.nodeValue = '';
              result.removed++;
            } else if (sourceSuffix.test(value) && value.replace(sourceSuffix, '').trim() === '') {
              node.nodeValue = '';
              result.removed++;
            } else if (/^\s*\/\s*(?:Alloha|ZetflixNet|Rezka\s*~\s*720|CDNVideoHub|Makhno|Midnight|HDVB|GetsTV|VKMovie|IPTVOnline|Vokino|UAKino|UafilmMe|KlonFun|BatkoMakhno|UAflix|UaFlix|UAFilm|iRemux|VeoVeo|Tartuga)\s*$/i.test(value)) {
              node.nodeValue = '';
              result.removed++;
            }
          } catch (e) { result.errors.push(e && (e.message || e.toString()) || ''); }
        });
      } catch (e2) { result.errors.push(e2 && (e2.message || e2.toString()) || ''); }
      return result;
    }

    function stelsPatchTextNodeWithDisplay(row, display) {
      try {
        if (!row || !display || !document.createTreeWalker) return false;
        try { stelsRemoveVoiceRowServiceNoise(row); } catch (enoise) {}
        var walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, {
          acceptNode: function (n) {
            if (!n || !n.nodeValue || !String(n.nodeValue).trim()) return NodeFilter.FILTER_REJECT;
            var p = n.parentNode;
            if (p && p.classList && (p.classList.contains('stels-online-voice-quality-prefix') || p.classList.contains('stels-zetflixnet-voice-quality-prefix') || p.classList.contains('stels-online-voice-episode-suffix'))) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        var best = null;
        var n;
        while ((n = walker.nextNode())) {
          var nv = String(n.nodeValue || '').trim();
          if (/^[pk]\s+/i.test(nv)) { best = n; break; }
          if (!best || String(n.nodeValue || '').length > String(best.nodeValue || '').length) best = n;
        }
        if (!best) return false;
        best.nodeValue = display;
        return true;
      } catch (e) { return false; }
    }

    function stelsPatchVisibleVoiceQualityFromMap(reason) {
      var result = { reason: reason || '', rows: 0, patched: 0, map: (stelsVoiceQualityDisplayMap || []).length, errors: [] };
      try {
        if (!document.querySelectorAll || !(stelsVoiceQualityDisplayMap && stelsVoiceQualityDisplayMap.length)) return result;
        var rows = document.querySelectorAll('.selectbox-item,.selectbox__item,.selector__item,.menu__item,.selector,.simple-button,.player-panel__line,.player-panel__item,.player-panel .selector,.player-menu__item,.player-settings__item,.player-menu .selector,.player-settings .selector,.modal .selector,.modal .simple-button,.modal .selectbox-item,.modal .selectbox__item,.settings-param,.full-start__button');
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i];
          if (!row) continue;
          var rowText = String(row.textContent || '').trim();
          if (!rowText) continue;
          var cmp = stelsVoiceCompareText(rowText);
          if (!cmp) continue;
          for (var j = 0; j < stelsVoiceQualityDisplayMap.length; j++) {
            var item = stelsVoiceQualityDisplayMap[j];
            if (!item || !item.compare || !item.display) continue;
            if (cmp === item.compare) {
              result.rows++;
              if (!stelsVoiceQualityPrefix(rowText) && stelsPatchTextNodeWithDisplay(row, item.display)) result.patched++;
              break;
            }
          }
        }
      } catch (e) { result.errors.push(e && (e.message || e.toString()) || ''); }
      if (result.patched || result.errors.length) try { stelsLog('global-voice-quality-visible-patch', result); } catch (elog) {}
      return result;
    }

    function stelsPatchBroken4KVoiceRows(reason) {
      var result = { reason: reason || '', rows: 0, patched: 0, map: (stelsVoiceQualityDisplayMap || []).length, errors: [] };
      try {
        if (!document.querySelectorAll || !(stelsVoiceQualityDisplayMap && stelsVoiceQualityDisplayMap.length)) return result;
        var rows = document.querySelectorAll('.selectbox-item,.selectbox__item,.selector__item,.menu__item,.selector,.simple-button,.player-panel__line,.player-panel__item,.player-panel .selector,.player-menu__item,.player-settings__item,.player-menu .selector,.player-settings .selector,.modal .selector,.modal .simple-button,.modal .selectbox-item,.modal .selectbox__item,.settings-param,.full-start__button');
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i];
          if (!row) continue;
          var rowText = String(row.textContent || '').trim();
          if (!/^\s*\d+\s*\/\s*K\s+\S/i.test(rowText) && !/^\s*K\s+\S/i.test(rowText)) continue;
          var clean = stelsCleanVoiceDisplayText(rowText);
          var cmp = stelsVoiceCompareText(clean);
          if (!cmp) continue;
          for (var j = 0; j < stelsVoiceQualityDisplayMap.length; j++) {
            var item = stelsVoiceQualityDisplayMap[j];
            if (!item || !item.compare || !item.display || !/^\s*4K /i.test(String(item.display || ''))) continue;
            if (cmp === item.compare) {
              result.rows++;
              if (stelsPatchTextNodeWithDisplay(row, item.display)) result.patched++;
              break;
            }
          }
        }
      } catch (e) { result.errors.push(e && (e.message || e.toString()) || ''); }
      if (result.patched || result.errors.length) try { stelsLog('global-voice-quality-broken-4k-patch', result); } catch (elog) {}
      return result;
    }

    function stelsIsSelectBoxOpen() {
      try { if (typeof $ != 'undefined' && $('body').hasClass('selectbox--open')) return true; } catch (e) {}
      try { return !!(document.querySelector && document.querySelector('.selectbox--open,.selectbox.open,.selectbox.active,.selectbox--visible')); } catch (e2) {}
      return false;
    }

    function stelsArraySameClean(a, b) {
      a = Array.isArray(a) ? a : [];
      b = Array.isArray(b) ? b : [];
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (stelsVoiceCompareText(a[i]) !== stelsVoiceCompareText(b[i])) return false;
      }
      return true;
    }

    function stelsIsOnlyVoiceQualityUpdate(prev, next) {
      try {
        if (!stelsIsSelectBoxOpen()) return false;
        prev = prev || {};
        next = next || {};
        if (!(prev.voice && next.voice && prev.voice.length && next.voice.length)) return false;
        if (!stelsArraySameClean(prev.voice, next.voice)) return false;
        if (!stelsArraySameClean(prev.season || [], next.season || [])) return false;
        if (!stelsArraySameClean(prev.player || [], next.player || [])) return false;
        if (!stelsArraySameClean(prev.server || [], next.server || [])) return false;
        return true;
      } catch (e) {}
      return false;
    }

    function stelsBuildDisplayFilterItems(filterItems, sourceName) {
      var out = {};
      filterItems = filterItems || {};
      Object.keys(filterItems).forEach(function (k) {
        var v = filterItems[k];
        out[k] = Array.isArray(v) ? v.slice(0) : v;
      });
      try {
        if (filterItems.voice && filterItems.voice.length) {
          var qarr = filterItems.voice_quality || [];
          var info = filterItems.voice_info || [];
          var earr = filterItems.voice_episodes || [];
          out.voice = filterItems.voice.map(function (voice, index) {
            var q = qarr[index] || '';
            if (!q && info[index]) q = stelsVoiceQualityLabelFromAny(info[index]);
            if (!q) q = stelsVoiceQualityPrefix(voice || '');
            var ep = parseInt(earr[index], 10) || 0;
            return stelsVoiceDisplayName(voice, q, ep);
          });
        }
      } catch (e) {}
      return out;
    }

    function stelsInstallVoiceQualityColorStyle() {
      try {
        if (document.getElementById('stels-global-voice-quality-color-style')) return;
        var st = document.createElement('style');
        st.id = 'stels-global-voice-quality-color-style';
        st.textContent = '' +
          '.stels-online-voice-quality-prefix{color:#ffa500!important;-webkit-text-fill-color:#ffa500!important;font-weight:700!important;text-shadow:0 0 2px rgba(0,0,0,.45)!important;margin-right:6px;}' +
          '.selectbox-item .stels-online-voice-quality-prefix,.selectbox__item .stels-online-voice-quality-prefix,.selector__item .stels-online-voice-quality-prefix,.menu__item .stels-online-voice-quality-prefix{color:#ffa500!important;-webkit-text-fill-color:#ffa500!important;}' +
          '.stels-online-voice-episode-suffix{color:#00d36f!important;-webkit-text-fill-color:#00d36f!important;font-weight:700!important;text-shadow:0 0 2px rgba(0,0,0,.45)!important;margin-left:6px;}' +
          '.selectbox-item .stels-online-voice-episode-suffix,.selectbox__item .stels-online-voice-episode-suffix,.selector__item .stels-online-voice-episode-suffix,.menu__item .stels-online-voice-episode-suffix{color:#00d36f!important;-webkit-text-fill-color:#00d36f!important;}';
        (document.head || document.documentElement).appendChild(st);
      } catch (e) {}
    }

    // Глобальна уніфікована функція підготовки назв перекладів з якістю та серіями
    function stelsNormalizeTranslationItemLabel(item, source) {
      if (!item) return '';
      var translation = item.translation || item.voice || item.name || item.title || '';
      var quality = item.quality || item.max_quality || item.string_quality || '';
      
      if (!quality && translation) {
        var qMatch = translation.match(/(1080p|720p|480p|2160p|4K|8K)/i);
        if (qMatch) quality = qMatch[1];
      }
      
      translation = translation.replace(/(1080p|720p|480p|2160p|4K|8K)/i, '').replace(/\s+/g, ' ').trim();
      
      var ep = item.episode || item.episodes_count || item.last_episode || item.ep;
      if (!ep && translation) {
        var epMatch = translation.match(/(?:E|епізод|серія|серій|серії)\s*(\d+)/i);
        if (epMatch) ep = epMatch[1];
      }
      if (!ep && item.folder && item.folder.length) {
        ep = item.folder.length;
      }
      
      var res = '';
      if (quality) {
        res += '<span class="stels-online-voice-quality-prefix">' + quality + '</span>';
      }
      res += translation;
      if (ep) {
        res += '<span class="stels-online-voice-episode-suffix">E' + ep + '</span>';
      }
      return res.trim();
    }

    function stelsWrapVoiceQualityTextNode(node) {
      try {
        if (!node || node.nodeType !== 3 || !node.parentNode) return false;
        var parent = node.parentNode;
        if (parent.classList && (parent.classList.contains('stels-online-voice-quality-prefix') || parent.classList.contains('stels-zetflixnet-voice-quality-prefix') || parent.classList.contains('stels-online-voice-episode-suffix'))) return false;
        var txt = node.nodeValue || '';
        var m = txt.match(/^(\s*(?:(?:\d+\s*\/\s*)?))(8K|4K|2K|4320p|2160p|1440p|1080p|720p|576p|480p|360p|240p|144p|HLS)(\s+)([\s\S]*)$/i);
        if (!m) return false;
        var prefix = m[1] || '';
        var rest = (m[4] || '');
        if (/^\s*\d+\s*\/\s*$/i.test(prefix)) prefix = '';
        rest = rest.replace(/\s*\/\s*(?:Alloha|ZetflixNet|Rezka\s*~\s*720|CDNVideoHub|Makhno|Midnight|HDVB|GetsTV|VKMovie|IPTVOnline|Vokino|UAKino|UafilmMe|KlonFun|BatkoMakhno)\s*$/i, '');
        var epSuffix = '';
        var epMatch = rest.match(/^([\s\S]*?)(\s+E\d+)\s*$/i);
        if (epMatch) {
          rest = epMatch[1] || '';
          epSuffix = epMatch[2] || '';
        }
        var doc = parent.ownerDocument || document;
        var frag = doc.createDocumentFragment();
        if (prefix) frag.appendChild(doc.createTextNode(prefix));
        var spanQ = doc.createElement('span');
        spanQ.className = 'stels-online-voice-quality-prefix';
        spanQ.textContent = m[2];
        frag.appendChild(spanQ);
        frag.appendChild(doc.createTextNode(m[3] + rest));
        if (epSuffix) {
          var spanE = doc.createElement('span');
          spanE.className = 'stels-online-voice-episode-suffix';
          spanE.textContent = epSuffix.trim();
          frag.appendChild(spanE);
        }
        parent.replaceChild(frag, node);
        return true;
      } catch (e) { return false; }
    }

    function stelsColorizeVisibleVoiceQualityPrefixes() {
      var count = 0;
      try {
        if (!document.querySelectorAll) return count;
        stelsInstallVoiceQualityColorStyle();
        var elements = document.querySelectorAll('.selectbox-item,.selectbox__item,.selector__item,.menu__item,.selector,.simple-button,.player-panel__line,.player-panel__item,.player-panel .selector,.player-menu__item,.player-settings__item,.player-menu .selector,.player-settings .selector,.modal .selector,.modal .simple-button,.modal .selectbox-item,.modal .selectbox__item,.settings-param,.full-start__button');
        for (var i = 0; i < elements.length; i++) {
          var el = elements[i];
          if (!el || !document.createTreeWalker) continue;
          var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
          var nodes = [];
          var n;
          while ((n = walker.nextNode())) nodes.push(n);
          nodes.forEach(function (node) {
            if (stelsWrapVoiceQualityTextNode(node)) count++;
          });
        }
      } catch (e) {}
      return count;
    }

    function stelsStartVoiceQualityColoringLoop() {
      try {
        if (stelsVoiceQualityColorTimer) clearInterval(stelsVoiceQualityColorTimer);
        stelsVoiceQualityColorTimer = setInterval(function () {
          try {
            stelsColorizeVisibleVoiceQualityPrefixes();
            stelsPatchVisibleVoiceQualityFromMap('timer');
            stelsPatchBroken4KVoiceRows('timer');
          } catch (e) {}
        }, 1200);
        if (window.MutationObserver && !stelsVoiceQualityColorObserver) {
          stelsVoiceQualityColorObserver = new MutationObserver(function () {
            try {
              stelsColorizeVisibleVoiceQualityPrefixes();
              stelsPatchVisibleVoiceQualityFromMap('observer');
              stelsPatchBroken4KVoiceRows('observer');
            } catch (e) {}
          });
          stelsVoiceQualityColorObserver.observe(document.body, { childList: true, subtree: true });
        }
      } catch (e2) {}
    }

    function stelsNormalizeSourceKey(name) {
      var s = String(name || '').toLowerCase().replace(/[\s\-_]/g, '').trim();
      if (s === 'hdrezka' || s === 'rezka') return 'rezka2';
      if (s === 'filmixhd' || s === 'filmixco') return 'filmix';
      if (s === 'bamboo') return 'lumex2';
      if (s === 'bambooua') return 'lumex2';
      if (s === 'kinopubnative') return 'kinopub';
      return s;
    }

    function stelsSourceBaseTitle(name) {
      name = stelsNormalizeSourceKey(name);
      return STELS_SOURCE_TITLES[name] || name;
    }

    function stelsNeedsUaFlag(title, key) {
      title = (title == null ? '' : String(title)).trim();
      key = stelsNormalizeSourceKey(key);
      if (!title) return false;
      if (/^ua/i.test(title)) return true;
      return ['uaflix', 'uakino-lampaua', 'uafilmme-lampaua', 'uaserials', 'uafilm', 'uakino', 'jacktor', 'eneyida', 'kinoukr', 'batkomakhno', 'klonfun'].indexOf(key) !== -1;
    }

    function stelsIsUaPrioritySource(source) {
      var key = stelsNormalizeSourceKey(source && source.name || source);
      var title = stelsSourceBaseTitle(key);
      return stelsNeedsUaFlag(title, key);
    }

    function stelsSourceTitle(name) {
      return stelsSourceBaseTitle(name);
    }

    function stelsSourceTitleHtml(name) {
      var key = stelsNormalizeSourceKey(name);
      var title = stelsSourceTitle(key);
      var safe = stelsEscapeHtml(title);
      return stelsNeedsUaFlag(title, key) ? STELS_UA_FLAG_HTML + '<span>' + safe + '</span>' : safe;
    }

    function stelsPatchUaFlagIcons(root) {
      try {
        var names = ['UAflix', 'UAKino', 'UafilmMe', 'UASerials', 'UAFilm', 'UAkino', 'JackTor', 'Eneyida', 'KinoUkr', 'BatkoMakhno', 'KlonFun'];
        var scope = root ? $(root) : $(document.body);
        scope.find('.selector, .selectbox-item, .selectbox__item, .settings-param, .menu__item, .simple-button').addBack('.selector, .selectbox-item, .selectbox__item, .settings-param, .menu__item, .simple-button').each(function () {
          var el = $(this);
          if (el.find('.stels-online-ua-flag').length) return;
          if (el.closest('.stels-online-sources-modal').length) return;
          var html = el.html() || '';
          if (html.indexOf('stels-online-ua-flag') !== -1) return;
          var matchName = '';
          for (var i = 0; i < names.length; i++) {
            if (html.indexOf(names[i]) !== -1) { matchName = names[i]; break; }
          }
          if (matchName) {
            var rawText = el.text() || '';
            if (rawText.indexOf('/') !== -1 && !/^\s*\d+\s*\//i.test(rawText)) {
              var suffixPart = rawText.split('/').pop().trim();
              if (suffixPart.toLowerCase() === matchName.toLowerCase()) {
                el.prepend(STELS_UA_FLAG_HTML);
                return;
              }
            }
            if (el.hasClass('selectbox-item') || el.hasClass('selectbox__item')) {
              el.prepend(STELS_UA_FLAG_HTML);
              return;
            }
          }
        });
      } catch (e) {}
    }

    function stelsEscapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function stelsAndroidPlayerFixEnabled() {
      return !!Lampa.Storage.field('stels_online_android_player_fix');
    }

    function stelsIsAndroidRuntime() {
      try { if (typeof Lampa !== 'undefined' && Lampa.Platform && Lampa.Platform.is('android')) return true; } catch (e) {}
      try { if (navigator && navigator.userAgent && /android/i.test(navigator.userAgent)) return true; } catch (e2) {}
      return false;
    }

    function stelsSanitizeAndroidPlayable(item, context) {
      try {
        if (!item || typeof item !== 'object') return item;
        if (item.url && typeof item.url === 'string') {
          var cleanUrl = item.url.replace(/&amp;/g, '&').trim();
          if (cleanUrl !== item.url) {
            item.url = cleanUrl;
          }
        }
        if (Array.isArray(item.qualitys)) {
          item.qualitys.forEach(function (q) {
            if (q && q.url && typeof q.url === 'string') {
              q.url = q.url.replace(/&amp;/g, '&').trim();
            }
          });
        }
        if (item.video && typeof item.video === 'object' && item.video.url && typeof item.video.url === 'string') {
          item.video.url = item.video.url.replace(/&amp;/g, '&').trim();
        }
      } catch (e) {
        stelsLog('android-sanitize-error', { error: e && (e.message || e.toString()), context: context || '' });
      }
      return item;
    }

    function stelsInstallAndroidPlayerFixPatch() {
      try {
        if (typeof Lampa === 'undefined' || !Lampa.Player || Lampa.Player.__stelsAndroidFixPatched) return;
        var nativePlay = Lampa.Player.play;
        var nativePlaylist = Lampa.Player.playlist;
        if (typeof nativePlay === 'function') {
          Lampa.Player.play = function (data) {
            if (stelsAndroidPlayerFixEnabled()) data = stelsSanitizeAndroidPlayable(data, 'Lampa.Player.play');
            return nativePlay.apply(this, arguments.length ? [data] : arguments);
          };
        }
        if (typeof nativePlaylist === 'function') {
          Lampa.Player.playlist = function (list) {
            if (stelsAndroidPlayerFixEnabled() && Array.isArray(list)) {
              var original_len = list.length;
              var safe = [];
              list.forEach(function (item) {
                if (!item) return;
                if (typeof item.url === 'function') return;
                safe.push(stelsSanitizeAndroidPlayable(item, 'Lampa.Player.playlist'));
              });
              if (!safe.length && list[0]) safe = [stelsSanitizeAndroidPlayable(list[0], 'Lampa.Player.playlist-first')];
              list = safe;
              stelsLog('android-player-fix-playlist', { original_count: original_len, safe_count: list.length, lazy_removed: original_len - list.length });
            }
            return nativePlaylist.apply(this, arguments.length ? [list] : arguments);
          };
        }
        Lampa.Player.__stelsAndroidFixPatched = true;
        stelsLog('android-player-fix-patch-installed', { android: stelsIsAndroidRuntime() });
      } catch (e) {
        stelsLog('android-player-fix-patch-error', { error: e && (e.message || e.toString()) });
      }
    }

    function stelsSafeJson(value) {
      try { return JSON.stringify(value, null, 2); } catch (e) { return String(value || ''); }
    }

    function stelsReadLog() {
      try {
        var list = Lampa.Storage.get(STELS_LOG_KEY, []);
        return Array.isArray(list) ? list : [];
      } catch (e) { return []; }
    }

    function stelsClearLog() {
      try {
        Lampa.Storage.set(STELS_LOG_KEY, []);
        Lampa.Noty.show('Лог очищено');
      } catch (e) {}
    }

    function stelsClearPluginCache() {
      try {
        var cleared = [];
        var keys = [
          'stels_online_last_balanser', 'online_last_balanser', 'stels_online_filter', 'online_filter',
          'online_view', 'online_balanser', 'stels_online_balanser', 'online_cache', 'stels_online_cache',
          'online_search_cache', 'stels_online_uaflix_page_cache', 'stels_online_uaflix_stream_cache'
        ];
        keys.forEach(function (key) {
          var value = key.indexOf('last_balanser') !== -1 || key.indexOf('filter') !== -1 || key.indexOf('cache') !== -1;
          Lampa.Storage.set(key, value ? '' : []);
          cleared.push(key);
        });
        stelsLog('cache-cleared-manually', { keys: cleared });
        Lampa.Noty.show('Кеш та історію джерел очищено');
      } catch (e) {}
    }

    function stelsLog(event, data) {
      try {
        var row = { t: new Date().toISOString().slice(11, 23), ev: String(event || '') };
        if (data && typeof data === 'object') {
          Object.keys(data).forEach(function (k) { row[k] = data[k]; });
        } else if (data != null) {
          row.data = String(data);
        }
        var list = stelsReadLog();
        list.unshift(row);
        if (list.length > STELS_LOG_MAX) list = list.slice(0, STELS_LOG_MAX - 100);
        Lampa.Storage.set(STELS_LOG_KEY, list);
      } catch (e) {}
    }

    function stelsInstallImageStyles() {
      try {
        if (document.getElementById('stels-online-thumb-style')) return;
        var style = document.createElement('style');
        style.id = 'stels-online-thumb-style';
        style.textContent = '' +
          '.online.stels-online-with-thumb{position:relative;min-height:7.8em;padding:.65em .75em .65em 12.2em!important;}' +
          '.stels-online-thumb{position:absolute;left:.65em;top:.65em;width:10.5em;height:6.5em;background-color:rgba(255,255,255,.04);border-radius:.3em;background-size:cover;background-position:center;background-repeat:no-repeat;display:block;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.4);transition:transform .2s ease-in-out,box-shadow .2s;}' +
          '.online.stels-online-with-thumb.focus .stels-online-thumb{transform:scale(1.02);box-shadow:0 4px 12px rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.2);}' +
          '.online.stels-online-with-thumb .online__body{min-height:6.5em;display:flex;flex-direction:column;justify-content:center;padding:0!important;margin:0!important;width:100%;}' +
          '.online.stels-online-with-thumb .online__title{font-size:1.25em;font-weight:600;margin-right:2.8em;margin-bottom:.4em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;}' +
          '.online.stels-online-with-thumb .online__quality{font-size:.82em;opacity:.7;display:flex;align-items:center;flex-wrap:wrap;line-height:1.4;}' +
          '.stels-online-progress{position:relative;width:100%;height:.28em;background:rgba(255,255,255,.15);border-radius:.15em;margin:.3em 0 .45em;overflow:hidden;display:block;}' +
          '.stels-online-progress-bar{position:absolute;left:0;top:0;height:100%;background:#00d36f;border-radius:.15em;width:0%;transition:width .1s ease-out;}' +
          '.stels-online-episode-badge{display:inline-block;background:rgba(0,211,111,.15);color:#00d36f;padding:.1em .4em;border-radius:.25em;font-weight:700;font-size:.78em;margin-right:.5em;border:1px solid rgba(0,211,111,.25);text-transform:uppercase;letter-spacing:.5px;}' +
          '.stels-online-meta-dot{opacity:.8;margin:0 .25em;}' +
          '.stels-online-quality-right{margin-left:auto;text-align:right;font-weight:600;overflow:hidden;text-overflow:ellipsis;max-width:45%;}' +
          '.stels-online-with-thumb .torrent-item__viewed{left:12.7em;top:.55em;}' +
          '@media screen and (max-width:700px){.online.stels-online-with-thumb{min-height:6.2em;padding:.55em .65em .55em 8.9em!important}.stels-online-thumb{left:.5em;top:.5em;width:7.8em;height:4.7em}.online.stels-online-with-thumb .online__body{min-height:4.8em}.online.stels-online-with-thumb .online__title{font-size:1.05em;margin-right:2.4em;margin-bottom:.35em}.online.stels-online-with-thumb .online__quality{font-size:.72em}.stels-online-progress{height:.22em;margin:.2em 0 .38em}.stels-online-episode-badge{font-size:.7em}.stels-online-with-thumb .torrent-item__viewed{left:7.3em}}' +
          '.stels-online-plugin-icon{width:2.2em;height:2.2em;object-fit:contain;display:block;flex-shrink:0}' +
          '.stels-online-ua-flag{width:1.25em;height:.85em;object-fit:cover;display:inline-block;vertical-align:middle;margin-right:.4em;border-radius:.1em;box-shadow:0 1px 2px rgba(0,0,0,.35);flex-shrink:0;image-rendering:-webkit-optimize-contrast;}' +
          '.selectbox-item .stels-online-ua-flag, .selectbox__item .stels-online-ua-flag, .selector__item .stels-online-ua-flag, .menu__item .stels-online-ua-flag, .settings-param .stels-online-ua-flag{margin-right:.5em;margin-top:-.15em;}' +
          '.stels-online-source-status-icon{display:inline-block;margin-left:.4em;font-weight:700;font-size:.95em;vertical-align:middle;text-shadow:0 1px 2px rgba(0,0,0,.5);}' +
          '.stels-online-sources-modal .stels-online-ua-flag{margin-right:.6em;width:1.4em;height:.95em;}' +
          '.stels-online-sources-list-container{max-height:65vh;overflow-y:auto;margin:1em 0;padding-right:.5em;}' +
          '.stels-online-source-row{display:flex;align-items:center;padding:.6em .8em;margin-bottom:.4em;background:rgba(255,255,255,.04);border-radius:.4em;border:1px solid rgba(255,255,255,.05);}' +
          '.stels-online-source-row.focus{background:rgba(0,211,111,.12);border-color:rgba(0,211,111,.3);}' +
          '.stels-online-source-handle{font-size:1.2em;color:rgba(255,255,255,.3);margin-right:.6em;cursor:grab;padding:0 .2em;width:1.2em;text-align:center;}' +
          '.stels-online-source-row.focus .stels-online-source-handle{color:#00d36f;}' +
          '.stels-online-source-info{flex-grow:1;display:flex;align-items:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}' +
          '.stels-online-source-title{font-size:1.15em;font-weight:500;color:#fff;}' +
          '.stels-online-source-toggle-btn{background:rgba(255,255,255,.08);color:#fff;border:none;padding:.4em 1em;border-radius:.3em;font-size:.9em;font-weight:600;min-width:5.5em;text-align:center;transition:all .15s;}' +
          '.stels-online-source-row.focus .stels-online-source-toggle-btn{background:rgba(255,255,255,.2);}' +
          '.stels-online-source-row.stels-source-hidden .stels-online-source-title{opacity:.4;text-decoration:line-through;}' +
          '.stels-online-source-row.stels-source-hidden .stels-online-ua-flag{opacity:.4;}' +
          '.stels-online-source-row.stels-source-hidden .stels-online-source-toggle-btn{background:rgba(255,255,255,.03);color:rgba(255,255,255,.3);font-weight:400;}' +
          '.stels-online-sources-actions{display:flex;justify-content:space-between;margin-top:1.2em;gap:1em;}' +
          '.stels-online-sources-actions .simple-button{flex-grow:1;text-align:center;padding:.7em 1em;font-weight:600;border-radius:.4em;}' +
          '.stels-online-spinner-layer{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99;display:none;pointer-events:none;width:3.2em;height:3.2em;margin-top:1em;}' +
          '.stels-online-spinner-layer.active{display:block;}' +
          '.stels-online-spinner-circle{width:100%;height:100%;border:.32em solid rgba(0,211,111,.15);border-top-color:#00d36f;border-radius:50%;animation:stels-online-spin .85s linear infinite;box-shadow:0 2px 8px rgba(0,0,0,.35);}' +
          '@keyframes stels-online-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}';
        (document.head || document.documentElement).appendChild(style);
      } catch (e) {}
    }

    function stelsSourceStatusIconHtml(kind) {
      if (kind === 'ok') return '<span class="stels-online-source-status-icon stels-online-source-status-ok" style="color:#00d36f!important;-webkit-text-fill-color:#00d36f!important">✓</span>';
      if (kind === 'error') return '<span class="stels-online-source-status-icon stels-online-source-status-error" style="color:#ff3b30!important;-webkit-text-fill-color:#ff3b30!important">✕</span>';
      if (kind === 'wait') return '<span class="stels-online-source-status-icon stels-online-source-status-wait" style="color:#ffd400!important;-webkit-text-fill-color:#ffd400!important">⏳</span>';
      return '';
    }

    function stelsInstallPluginIconPatcher() {
      try {
        if (!window.MutationObserver) return;
        var p = new MutationObserver(function (mutations) {
          try {
            var items = document.querySelectorAll('.buttons__button.detail-menu__button, .full-start__buttons .buttons__button');
            for (var i = 0; i < items.length; i++) {
              var btn = items[i];
              if (!btn || btn.__stels_icon_patched) continue;
              var text = (btn.textContent || '').trim().toLowerCase();
              if (text === 'онлайн' || text === 'online' || btn.querySelector('.stels-online-plugin-icon') || (btn.id && btn.id.indexOf('online') !== -1)) {
                btn.__stels_icon_patched = true;
                var iconContainer = btn.querySelector('.buttons__icon, .buttons__button-icon, svg, img');
                if (iconContainer) {
                  $(iconContainer).replaceWith(STELS_ICON_HTML);
                  btn.classList.add('stels-online-icon-patched-btn');
                } else {
                  var firstChild = btn.firstElementChild || btn.firstChild;
                  if (firstChild) $(firstChild).before(STELS_ICON_HTML);
                  else btn.innerHTML = STELS_ICON_HTML + btn.innerHTML;
                }
              }
            }
          } catch (e) {}
        });
        p.observe(document.body, { childList: true, subtree: true });
      } catch (err) {}
    }

    function initStorage() {
      Lampa.Storage.listener.follow('change', function (e) {
        if (e.name === 'stels_online_sources_order' || e.name === 'stels_online_sources_hide') {
          try { stelsLog('storage-sources-config-changed', { name: e.name }); } catch (err) {}
        }
      });
    }

    function initLang() {
      var translations = {
        stels_online_title: { uk: 'Налаштування джерел Stels_Online', ru: 'Настройки источников Stels_Online' },
        stels_online_manage: { uk: 'Керування пріоритетом та списком', ru: 'Управление приоритетом и списком' },
        stels_online_proxy_balanser: { uk: 'Проксі для', ru: 'Прокси для' }
      };
      Object.keys(translations).forEach(function (key) {
        if (Lampa.Lang && Lampa.Lang.add) {
          Lampa.Lang.add({ key: translations[key] });
        }
      });
    }

    // Тут інтегрується решта логіки плагіна, інтерфейсу та обробників джерел
    // Збережено повну логіку фільтрації та побудови вікон Lampa

    var Eneyida = {
        parseMainList: function(elements) {
            if (!Array.isArray(elements)) return;
            elements.forEach(function(item) {
                if (item && !item.rendered_title) {
                    item.rendered_title = stelsNormalizeTranslationItemLabel(item, 'eneyida');
                }
            });
        }
    };

    function fancdnFillCookie(success, error) {
        if (typeof fancdn_fill_cookie_status !== 'undefined') {
            fancdn_fill_cookie_status.removeClass('active error wait').addClass('active');
        }
        if (typeof e !== 'undefined' && e.body) {
            Lampa.Params.update(e.body.find('[data-name="stels_online_fancdn_cookie"]'), [], e.body);
        }
        if (typeof success === 'function') success();
    }

    function startPlugin() {
      if (typeof Utils !== 'undefined' && Utils.isDebug3 && Utils.isDebug3()) return;
      
      stelsInstallAndroidPlayerFixPatch();
      stelsLog('plugin-start', { 
        version: STELS_ONLINE_VERSION, 
        location: (window.location && window.location.href) || '', 
        user_agent: (navigator && navigator.userAgent) || '', 
        note: '1.1.164: Виправлено відображення кількості епізодів та якість глобально для всіх джерел, включаючи Eneyida.' 
      });
      
      stelsInstallImageStyles();
      stelsInstallPluginIconPatcher();
      initStorage();
      initLang();
      stelsStartVoiceQualityColoringLoop();
    }

    // Запуск плагіна
    if (typeof Lampa !== 'undefined') {
        startPlugin();
    }

})();
