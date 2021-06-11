// This file is not used (yet). But it does show all the d3 methods
// used in CGView and in what classes they are used. This will be useful
// when/if d3 is removed from CGView.
import { select, selectAll, pointer, event } from 'd3-selection';
import { format, formatPrefix, precisionPrefix } from 'd3-format';
import { ticks, tickStep, min, max, mean, median } from 'd3-array';
import { scaleLinear, scalePow } from 'd3-scale';
import { timeFormat } from 'd3-time-format';
import { zoom, zoomTransform } from 'd3-zoom';
import { easeCubic, interpolate, interpolateArray } from 'd3-ease';

export {
  // Viewer, Viewer-Zoom, IO, EventMonitor, ColorPicker, Canvas, Messenger
  select,
  // ColorPicker (once)
  selectAll,
  // WAS 'mouse' - NOW 'pointer', Canvas, ColorPicker
  pointer,
  // Utils
  format,
  // Ruler
  formatPrefix, precisionPrefix, ticks, tickStep,
  // Layout, Plot, IO
  min,
  // Layout, Legend, Plot, Caption
  max,
  // Plot (once)
  mean, median,
  // Layout
  scaleLinear,
  // IO (once)
  timeFormat,
  // IO, EventMonitor, ColorPicker, Viewer-Zoom
  event,
  // Viewer-Zoom
  zoom,
  // Layout, Viewer
  zoomTransform,
  // Viewer
  scalePow, easeCubic, interpolateArray, interpolate,
};


