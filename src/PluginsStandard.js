//////////////////////////////////////////////////////////////////////////////
// CGView Standard Builtin Plugins
//////////////////////////////////////////////////////////////////////////////

/**
 *  PluginsStandard is a collection of default plugins that are included with the CGview.
 *  These plugins are installed when the CGview is created.
 *
 * Currently, the following plugins are included:
 * - CaptionTrackList
 *
 */
export const PluginsStandard = [
  CaptionTrackList,
];


//////////////////////////////////////////////////////////////////////////////
// Plugin: CaptionTrackList
//////////////////////////////////////////////////////////////////////////////

/**
 * CaptionTrackList is a plugin that adds a caption to the map that lists
 * the tracks in the order they are displayed. The caption is updated whenever
 * tracks are added, removed, updated, or moved.
 */
// Plugin: CaptionDynamicText
// OPTIONS
// - collapseTracks: Bool [default: false]
// - startFrom: String: outside, inside, backbone [default: 'outside']
// - separator: String: return, semicolon, comma [default: 'return']
export const CaptionTrackList = {
  name:    'CaptionTrackList',
  id:      'pluginCaptionTrackList',
  version: '0.1.0',
  type:    'General',
  install: function(cgv) {
    const pluginName = this.name;
    console.log(`Installing ${pluginName}`);

    function setDynamicText(cgv) {
      const tracks = cgv.tracks();
      cgv.captions().forEach(caption => {
        if (caption.hasPlugin(pluginName)) {
          console.log("Setting dynamic text for caption", caption);
          const options = caption.optionsForPlugin(pluginName);
          console.log("Options", options);
          caption.name = getListingText(tracks, cgv.format === 'linear', options);
        }
      });
    }

    // FIXME: track-update MUST ignore the loading of GC content/skew
    cgv.on(`captions-add.${pluginName}`,  () => { setDynamicText(cgv); });
    cgv.on(`captions-update.${pluginName}`, () => { setDynamicText(cgv); });
    cgv.on(`tracks-add.${pluginName}`,    () => { setDynamicText(cgv); });
    cgv.on(`tracks-remove.${pluginName}`, () => { setDynamicText(cgv); });
    cgv.on(`tracks-update.${pluginName}`, () => { setDynamicText(cgv); });
    cgv.on(`tracks-moved.${pluginName}`,  () => { setDynamicText(cgv); });
    cgv.on(`settings-update.${pluginName}`, ({ attributes }) => {
      if (attributes.format) {
        setDynamicText(cgv);
      }
    });
  },
  uninstall: function(cgv) {
    const pluginName = this.name;
    console.log(`Uninstalling ${pluginName}`);
    cgv.off(`captions-add.${pluginName}`);
    cgv.off(`captions-update.${pluginName}`);
    cgv.off(`tracks-add.${pluginName}`);
    cgv.off(`tracks-remove.${pluginName}`);
    cgv.off(`tracks-update.${pluginName}`);
    cgv.off(`tracks-moved.${pluginName}`);
    cgv.off(`settings-update.${pluginName}`);
  }
};



function getSeparator(separatorKey) {
  const defaultSeparator = 'return'
  const separatorName = separatorKey || defaultSeparator;
  const separatorMap = {
    return: '\n',
    semicolon: '; ',
    comma: ', ',
  }
  return separatorMap[separatorName];
}

function getListingText(tracks, isLinear=false, options={}) {
  // console.log(options)
  //FIXME: This is a hack to get the startFrom option to work
  const startOutside = options.startFrom === 'outside';
  const separator = getSeparator(options.separator);
  const label = isLinear ? 'lane' : 'ring';
  const direction = isLinear ? (startOutside ? 'top' : 'bottom') : (startOutside ? 'outermost' : 'innermost');
  let text = `Starting from the ${direction} ${label}:`;
  text += (separator === '\n') ? "\n" : " ";
  const listing = [{track: {name: 'Backbone (Contigs)', backbone: true}}];
  for (const track of tracks) {
    if (track.separateFeaturesBy === 'none' || track.type === 'plot') {
      if (track.position === 'inside') {
        listing.push({track})
      } else {
        listing.unshift({track});
      }
    } else if (track.separateFeaturesBy === 'strand') {
      if (track.position === 'inside') {
        ['+', '-'].forEach( (s) => { listing.push({track, slot: s}) });
      } else if (track.position === 'outside') {
        ['-', '+'].forEach( (s) => { listing.unshift({track, slot: s}) });
      } else {
        listing.unshift({track, slot: '+'});
        listing.push({track, slot: '-'})
      }
    } else if (track.separateFeaturesBy === 'readingFrame') {
      if (track.position === 'inside') {
        ['+3', '+2', '+1', '-1', '-2', '-3'].forEach( (s) => { listing.push({track, slot: s}) });
      } else if (track.position === 'outside') {
        ['-3', '-2', '-1', '+1', '+2', '+3'].forEach( (s) => { listing.unshift({track, slot: s}) });
      } else {
        ['+1', '+2', '+3'].forEach( (s) => { listing.unshift({track, slot: s}) });
        ['-1', '-2', '-3'].forEach( (s) => { listing.push({track, slot: s}) });
      }
    } else if (['type', 'legend'].includes(track.separateFeaturesBy)) {
      const features = track.featuresBy(track.separateFeaturesBy);
      const typesOrLegends = Object.keys(features);
      // Sort by number of features
      typesOrLegends.sort((a, b) => features[b].length - features[a].length);
      if (track.position === 'inside') {
        typesOrLegends.forEach( (s) => { listing.push({track, slot: s}) });
      } else {
        typesOrLegends.forEach( (s) => { listing.unshift({track, slot: s}) });
      }
    }
  }

  if (!startOutside) {
    listing.reverse();
  }

  let entries = [];
  let slots = [];
  if (options.collapseTracks) {
    for (let i=0, len=listing.length; i < len; i++) {
      const track = listing[i].track;
      const s = listing[i].slot;
      const next = listing[i+1];
      slots.push(s);
      if (next && next.track === track) {
        continue;
      }
      entries.push(`${displayLabel(i, slots, track.backbone, isLinear)}${track.name}${displaySlots(slots)}`);
      slots = [];
    }
  } else {
    entries = listing.map( (t, i) => `${displayLabel(i, slots, t.track.backbone, isLinear)}${t.track.name}${displaySlots(t.slot)}` );
  }
  return text + entries.join(`${separator}`);
}

function displayLabel(index, slots=[], backbone=false, isLinear=false) {
  const linearLabel = 'Lane';
  const circularLabel = 'Ring';
  if (backbone) return '';
  slots = (Array.isArray(slots)) ? slots : [slots];
  let label = isLinear ? linearLabel : circularLabel;
  if (slots.length > 1) { label += 's'; }

  if (slots.length <= 1) {
    return `${label} ${index+1}: `;
  } else if (slots.length === 2) {
    return `${label} ${index},${index+1}: `;
  } else {
    return `${label} ${index+2 - slots.length}-${index+1}: `;
  }
}

// Slots is an array of strings that decribes specific slots
// Returns a empty string or a string cotainin each slot
function displaySlots(slots) {
  let displayText = '';
  if(slots === undefined) return displayText;

  slots = (Array.isArray(slots)) ? slots : [slots];
  if (slots.length > 0 && slots[0] !== undefined) {
    displayText += ` (${slots.join(',')})`;
  }

  return displayText;
}