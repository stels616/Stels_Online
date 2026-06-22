// Stels_Online based on online_mod.js
// FIXED VERSION 1.1.173 - Resolves Tortuga playback error and auto-hiding source list

(function () {
    'use strict';

    var STELS_ONLINE_VERSION = '1.1.173';
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
    var stelsSelectboxProtected = false;

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
      eneyida: 'eneyida', uaserials: 'uaserials', jacktor: 'lampaua-jacktor', kinotochka: 'rc-kinotochka', iremux: 'rc-iremux',
      uaflix: 'lampaua-uaflix', klonfun: 'lampaua-klonfun', batkomakhno: 'lampaua-batkomakhno', 'uakino-lampaua': 'lampaua-uakino',
      'uafilmme-lampaua': 'lampaua-uafilmme', rezka720: 'lampaua-rezka720', makhno: 'makhno', filmixtv: 'filmix',
      fxapi: 'filmix', animeon: 'anilibria2', mikai: 'animelib', moonanime: 'anilibria2', starlight: 'starlight',
      remux: 'cdnmovies', animedia: 'animelib', animego: 'animelib', animevost: 'animelib', animebesst: 'animelib',
      mirage: 'rc-mirage', phantom: 'collaps-dash', vokino: 'cdnvideohub', hydraflix: 'videoseed', videasy: 'videoseed',
      vidsrc: 'videoseed', movpi: 'videoseed', vidlink: 'videoseed', smashystream: 'videoseed', autoembed: 'videoseed',
      pidtor: 'collaps-dash', iptvonline: 'cdnvideohub', veoveo: 'rc-veoveo', tartuga: 'tartuga', kinoflix: 'videoseed',
      leproduction: 'videoseed', vkmovie: 'cdnvideohub', asiage: 'rezka2', geosaitebi: 'rezka2', dreamerscast: 'rezka2',
      getstv: 'getstv'
    };

    // ========== FIX #1: SELECTBOX PROTECTION ==========
    function stelsIsSelectBoxOpen() {
      try { if (typeof $ != 'undefined' && $('body').hasClass('selectbox--open')) return true; } catch (e) {}
      try { return !!(document.querySelector && document.querySelector('.selectbox--open,.selectbox.open,.selectbox.active,.selectbox--visible')); } catch (e2) {}
      return false;
    }

    function stelsShouldProtectSelectbox() {
      return stelsIsSelectBoxOpen() || stelsSelectboxProtected;
    }

    function stelsProtectSelectbox(callback) {
      stelsSelectboxProtected = true;
      try {
        callback();
      } finally {
        setTimeout(function() { stelsSelectboxProtected = false; }, 100);
      }
    }

    // ========== FIX #2: TORTUGA QUALITY CAP ==========
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
        text.replace(/(^|[^a-z0-9])((?:4320|2160|1440|1080|720|576|480|360|240|144)\s*p)([^a-z0-9]|$)/ig, function (all, pre, q) {
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
      // FIX: Added Tortuga support
      if (source === 'tartuga' || source === 'lampaua-tartuga' || source === 'lme_tartuga') return 1080;
      return 0;
    }

    function stelsClampSourceQualityValue(source, value) {
      value = parseInt(value, 10) || 0;
      if (!value) return 0;
      var cap = stelsSourceQualityCap(source);
      if (cap && value > cap) return cap;
      return value;
    }

    function stelsNormalizeSourceKey(source) {
      if (!source) return '';
      source = String(source).toLowerCase().trim();
      // FIX: Enhanced normalization for Tortuga
      if (source === 'lme_tartuga' || source === 'tartuga-lampaua') return 'tartuga';
      if (source === 'lme_uaflix') return 'uaflix';
      if (source === 'lme_klonfun') return 'klonfun';
      if (source === 'lme_makhno') return 'batkomakhno';
      if (source === 'lme_uakino') return 'uakino';
      if (source === 'lme_uafilmme') return 'uafilmme';
      return source.replace(/[^a-z0-9]/g, '');
    }

    // ========== VOICE QUALITY SYSTEM ==========
    var STELS_VOICE_QUALITY_RE = /^(?:8K|4K|2K|4320p|2160p|1440p|1080p|720p|576p|480p|360p|240p|144p|HLS)$/i;
    var stelsVoiceQualityColorObserver = null;
    var stelsVoiceQualityColorTimer = 0;
    var stelsVoiceQualityDisplayMap = [];

    function stelsVoiceQualityPrefix(value) {
      var m = String(value == null ? '' : value).trim().match(/^(8K|4K|2K|4320p|2160p|1440p|1080p|720p|576p|480p|360p|240p|144p|HLS)(?:\s+|$)/i);
      return m ? m[1] : '';
    }

    function stelsStripVoiceQuality(value) {
      return String(value == null ? '' : value).replace(/^\s*(?:8K|4K|2K|4320p|2160p|1440p|1080p|720p|576p|480p|360p|240p|144p|HLS)\s+/i, '').trim();
    }

    function stelsHasVoiceEpisodeSuffix(value) {
      return /[\s\u00a0]+[EeЕе]\d+\s*$/i.test(String(value == null ? '' : value));
    }

    function stelsVoiceQualityLabelFromAny(value) {
      var q = 0;
      try { q = stelsExtractMaxQualityFromAny(value, 0, 'quality'); } catch (e) {}
      return q ? stelsQualityLabel(q) : '';
    }

    function stelsCleanVoiceDisplayText(value) {
      var text = String(value == null ? '' : value).replace(/&nbsp;/g, ' ').trim();
      text = text.replace(/[✓✔]/g, ' ').trim();
      text = text.replace(/^\s*\d+\s*\/\s*/i, '').trim();
      text = text.replace(/\s*\/\s*(?:Alloha|ZetflixNet|Rezka\s*~\s*720|CDNVideoHub|Makhno|Midnight|HDVB|GetsTV|VKMovie|IPTVOnline|Vokino|UAKino|UafilmMe|KlonFun|BatkoMakhno|UAflix|UaFlix|UAFilm|iRemux|VeoVeo|Tartuga|UASerials)\s*$/i, '').trim();
      text = text.replace(/^\s*p\s+(?=\S)/i, '').trim();
      text = text.replace(/^\s*k\s+(?=\S)/i, '').trim();
      return text.replace(/\s+/g, ' ').trim();
    }

    function stelsStripVoiceEpisodeSuffix(value) {
      return String(value == null ? '' : value).replace(/[\s\u00a0]+[EeЕе]\d+\s*$/i, '').trim();
    }

    function stelsVoiceCompareText(value) {
      return stelsStripVoiceEpisodeSuffix(stelsStripVoiceQuality(stelsCleanVoiceDisplayText(value))).replace(/\s+/g, ' ').toLowerCase();
    }

    function stelsVoiceDisplayName(name, quality, episodeCount) {
      name = String(name == null ? '' : name).trim();
      quality = String(quality == null ? '' : quality).trim();
      if (!name) return name;
      var ep = parseInt(episodeCount, 10) || 0;
      var epSuffix = ep > 0 ? (' E' + ep) : '';
      var nameQuality = stelsVoiceQualityPrefix(name);
      if (!quality && nameQuality) quality = nameQuality;
      if (!quality && STELS_VOICE_QUALITY_RE.test(name)) return epSuffix && !stelsHasVoiceEpisodeSuffix(name) ? (name + epSuffix) : name;
      var baseName = quality ? stelsStripVoiceQuality(name) : name;
      if (!baseName) baseName = name;
      if (epSuffix) baseName = stelsStripVoiceEpisodeSuffix(baseName);
      var withEp = epSuffix ? (baseName + epSuffix) : baseName;
      return quality ? (quality + '  ' + withEp) : withEp;
    }

    function stelsEscapeRegExp(value) {
      return String(value == null ? '' : value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ========== FIX #1: PROTECTED VOICE QUALITY PATCHING ==========
    function stelsPatchVisibleVoiceQualityFromMap(reason) {
      var result = { reason: reason || '', rows: 0, patched: 0, map: (stelsVoiceQualityDisplayMap || []).length, errors: [], skipped: false };
      try {
        // FIX: Skip patching if selectbox is open or protected
        if (stelsShouldProtectSelectbox()) {
          result.skipped = true;
          try { stelsLog('voice-quality-patch-skipped', { reason: 'selectbox-protected', mapSize: (stelsVoiceQualityDisplayMap || []).length }); } catch (e) {}
          return result;
        }

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
              if (stelsPatchTextNodeWithDisplay(row, item.display)) result.patched++;
              break;
            }
          }
        }
      } catch (e) { result.errors.push(e && (e.message || e.toString()) || ''); }
      if (result.patched || result.errors.length || result.skipped) try { stelsLog('global-voice-quality-visible-patch', result); } catch (elog) {}
      return result;
    }

    function stelsPatchBroken4KVoiceRows(reason) {
      var result = { reason: reason || '', rows: 0, patched: 0, map: (stelsVoiceQualityDisplayMap || []).length, errors: [] };
      try {
        // FIX: Skip if selectbox is protected
        if (stelsShouldProtectSelectbox()) return result;

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
            if (!item || !item.compare || !item.display || !/^\s*4K/i.test(String(item.display || ''))) continue;
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

    function stelsRemoveVoiceRowServiceNoise(row) {
      var result = { removed: 0, errors: [] };
      try {
        if (!row || !document.createTreeWalker) return result;
        var sourceSuffix = /\/\s*(?:Alloha|ZetflixNet|Rezka\s*~\s*720|CDNVideoHub|Makhno|Midnight|HDVB|GetsTV|VKMovie|IPTVOnline|Vokino|UAKino|UafilmMe|KlonFun|BatkoMakhno|UAflix|UaFlix|UAFilm|iRemux|VeoVeo|Tartuga|UASerials)\s*$/i;
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
            } else if (/\s*\/\s*(?:Alloha|ZetflixNet|Rezka\s*~\s*720|CDNVideoHub|Makhno|Midnight|HDVB|GetsTV|VKMovie|IPTVOnline|Vokino|UAKino|UafilmMe|KlonFun|BatkoMakhno|UAflix|UaFlix|UAFilm|iRemux|VeoVeo|Tartuga|UASerials)\s*$/i.test(value)) {
              node.nodeValue = '';
              result.removed++;
            }
          } catch (e) { result.errors.push(e && (e.message || e.toString()) || ''); }
        });
      } catch (e2) { result.errors.push(e2 && (e2.message || e2.toString()) || ''); }
      return result;
    }

    function stelsRememberVoiceQualityDisplayMap(rawVoices, displayVoices, sourceName) {
      try {
        if (!(rawVoices && rawVoices.length) || !(displayVoices && displayVoices.length)) return;
        var next = [];
        rawVoices.forEach(function (raw, index) {
          var display = displayVoices[index] || '';
          var cleanRaw = stelsCleanVoiceDisplayText(raw || '');
          var cmp = stelsVoiceCompareText(cleanRaw);
          if (!cmp) return;
          if (!stelsVoiceQualityPrefix(display) && !stelsHasVoiceEpisodeSuffix(display) && stelsVoiceCompareText(stelsStripVoiceQuality(display)) === cmp) return;
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

    function stelsArraySameClean(a, b) {
      a = Array.isArray(a) ? a : [];
      b = Array.isArray(b) ? b : [];
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (stelsVoiceCompareText(a[i]) !== stelsVoiceCompareText(b[i])) return false;
      }
      return true;
    }

    function stelsIsOnlyVoiceDisplayPatch(prev, next) {
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

    function stelsIsOnlyVoiceQualityUpdate(prev, next) {
      return stelsIsOnlyVoiceDisplayPatch(prev, next);
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

    function stelsVoiceEpisodeSelectedSeasonGlobal(filterItems, choiceArg) {
      try {
        filterItems = filterItems || {};
        choiceArg = choiceArg || {};
        if (filterItems.season_num && filterItems.season_num.length) return parseInt(filterItems.season_num[choiceArg.season || 0], 10) || 0;
        var seasonTitle = filterItems.season && filterItems.season[choiceArg.season || 0] || '';
        var m = String(seasonTitle || '').match(/\d+/);
        if (m) return parseInt(m[0], 10) || 0;
      } catch (e) {}
      return 0;
    }

    function stelsVoiceNameFromItemGlobal(element) {
      var voice = '';
      try {
        voice = element && (element.translate_voice || element.voice || element.voice_name || element.translation_name || element.translate && element.translate.name) || '';
        if (!voice && element && (element.voiceStudio || element.voiceType)) voice = element.voiceStudio || element.voiceType;
        if (!voice && element && element.translation) voice = element.translation.title || element.translation.name || '';
        if (!voice && element && element.info) voice = String(element.info || '').replace(/^\s*\/\s*/, '');
        if (!voice && element && element.media) voice = element.media.voiceStudio || element.media.voiceType || element.media.translation_name || element.media.translation || '';
        if (!voice && element && element.team) voice = element.team.name || '';
        if (!voice && element && element.type) voice = element.type.title || '';
        if (!voice && element && element.author) voice = element.author.title || element.author.name || '';
      } catch (e) {}
      return stelsCleanVoiceDisplayText(voice || '');
    }

    function stelsExtractMaxQualityFromAny(value, defaultValue, fieldName) {
      try {
        if (value == null) return defaultValue || 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          var q = stelsQualityToValue(value);
          return q || (defaultValue || 0);
        }
        if (typeof value === 'object') {
          var max = 0;
          var fields = ['quality', 'max_quality', 'height', 'resolution', 'res', fieldName || 'quality'];
          for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (value[f] != null) {
              var v = stelsExtractMaxQualityFromAny(value[f], 0, fieldName);
              if (v && v > max) max = v;
            }
          }
          if (value.translations || value.translation) {
            var tr = value.translations || (value.translation ? [value.translation] : []);
            if (Array.isArray(tr)) {
              tr.forEach(function (t) {
                if (t) {
                  var v = stelsExtractMaxQualityFromAny(t, 0, fieldName);
                  if (v && v > max) max = v;
                }
              });
            }
          }
          if (value.items || value.episodes || value.files) {
            var items = value.items || value.episodes || value.files || [];
            if (Array.isArray(items)) {
              items.forEach(function (item) {
                if (item) {
                  var v = stelsExtractMaxQualityFromAny(item, 0, fieldName);
                  if (v && v > max) max = v;
                }
              });
            }
          }
          return max || (defaultValue || 0);
        }
        return defaultValue || 0;
      } catch (e) {
        return defaultValue || 0;
      }
    }

    function stelsInstallVoiceQualityColorStyle() {
      try {
        if (document.getElementById('stels-global-voice-quality-color-style')) return;
        var st = document.createElement('style');
        st.id = 'stels-global-voice-quality-color-style';
        st.textContent = '' +
          '.stels-online-voice-quality-prefix{color:#ffc400!important;-webkit-text-fill-color:#ffc400!important;font-weight:700!important;text-shadow:0 0 2px rgba(0,0,0,.45)!important;}' +
          '.selectbox-item .stels-online-voice-quality-prefix,.selectbox__item .stels-online-voice-quality-prefix,.selector__item .stels-online-voice-quality-prefix,.menu__item .stels-online-voice-quality-prefix{color:#ffc400!important;-webkit-text-fill-color:#ffc400!important;}' +
          '.stels-online-voice-episode-suffix{color:#ffc400!important;-webkit-text-fill-color:#ffc400!important;font-weight:700!important;text-shadow:0 0 2px rgba(0,0,0,.45)!important;}' +
          '.selectbox-item .stels-online-voice-episode-suffix,.selectbox__item .stels-online-voice-episode-suffix,.selector__item .stels-online-voice-episode-suffix,.menu__item .stels-online-voice-episode-suffix{color:#ffc400!important;-webkit-text-fill-color:#ffc400!important;}';
        (document.head || document.documentElement).appendChild(st);
      } catch (e) {}
    }

    function stelsSetupVoiceQualityColorObserver() {
      try {
        if (stelsVoiceQualityColorObserver) {
          try { stelsVoiceQualityColorObserver.disconnect(); } catch (e) {}
          stelsVoiceQualityColorObserver = null;
        }

        if (!document || !document.body || !MutationObserver) return;

        var target = document.body;
        var config = {
          childList: true,
          subtree: true,
          characterData: false,
          attributes: false
        };

        stelsVoiceQualityColorObserver = new MutationObserver(function (mutations) {
          try {
            if (stelsShouldProtectSelectbox()) return;

            clearTimeout(stelsVoiceQualityColorTimer);
            stelsVoiceQualityColorTimer = setTimeout(function () {
              try {
                if (stelsShouldProtectSelectbox()) return;
                stelsPatchVisibleVoiceQualityFromMap('mutation-observer');
                stelsPatchBroken4KVoiceRows('mutation-observer');
              } catch (e) {}
            }, 50);
          } catch (e) {}
        });

        stelsVoiceQualityColorObserver.observe(target, config);
        try { stelsLog('global-voice-quality-color-observer-installed', { ok: true }); } catch (e) {}
      } catch (e) {
        try { stelsLog('global-voice-quality-color-observer-error', { error: e && (e.message || e.toString()) || '' }); } catch (e2) {}
      }
    }

    function stelsLog(event, data) {
      try {
        if (!window || !window.localStorage) return;
        var logData = window.localStorage.getItem(STELS_LOG_KEY);
        var entries = [];
        if (logData) {
          try { entries = JSON.parse(logData); } catch (e) { entries = []; }
        }
        if (!Array.isArray(entries)) entries = [];
        if (entries.length >= STELS_LOG_MAX) entries.shift();
        entries.push({
          time: new Date().toISOString(),
          event: event,
          data: data
        });
        try {
          window.localStorage.setItem(STELS_LOG_KEY, JSON.stringify(entries));
        } catch (e) {}
      } catch (e) {}
    }

    function stelsInit() {
      try {
        stelsInstallVoiceQualityColorStyle();
        stelsInstallPrecheckNotyGuard(true);

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', stelsSetupVoiceQualityColorObserver);
        } else {
          stelsSetupVoiceQualityColorObserver();
        }

        stelsLog('stels-online-initialized', {
          version: STELS_ONLINE_VERSION,
          date: new Date().toISOString()
        });
      } catch (e) {
        try { stelsLog('stels-online-init-error', { error: e && (e.message || e.toString()) || '' }); } catch (e2) {}
      }
    }

    window.stelsProtectSelectbox = stelsProtectSelectbox;
    window.stelsShouldProtectSelectbox = stelsShouldProtectSelectbox;

    stelsInit();

})();
