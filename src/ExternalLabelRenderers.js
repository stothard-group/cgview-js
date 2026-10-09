/** External label renderer registration. Copyright 2026 Jason R. Grant. Apache-2.0. */
import LabelRendererClassic from './LabelRendererClassic';
import LabelRendererAdaptive from './LabelRendererAdaptive';

const registry = new Map();

/**
 * Register a renderer class for annotation.labelMethod.
 * @param {String} id - Unique, stable lowercase ID, also saved in map JSON.
 * @param {Function} Renderer - Class with draw(frame); optional reset/destroy hooks.
 * @param {Object} [metadata={}] - Label, description, optional usesPriority boolean, controls
 *   [{key, type: 'checkbox'|'range'|'number', label, defaultValue, description?}]; numeric
 *   controls specify min, step and max (optional for numbers). Ranges can add minLabel/maxLabel.
 * @returns {void} Adds to this bundle's registry; existing entries cannot be replaced.
 * @example
 * registerExternalLabelRenderer('renderer-1', ExternalLabelRenderer1, {label: 'Renderer 1'});
 */
export function registerExternalLabelRenderer(id, Renderer, metadata = {}) {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) { throw new TypeError('Invalid external label renderer ID'); }
  if (registry.has(id)) { throw new Error(`External label renderer '${id}' is already registered`); }
  if (typeof Renderer !== 'function' || typeof Renderer.prototype?.draw !== 'function') {
    throw new TypeError('An external label renderer must implement draw(frame)');
  }
  if (metadata.usesPriority !== undefined && typeof metadata.usesPriority !== 'boolean') {
    throw new TypeError('Renderer usesPriority must be a boolean');
  }
  const controls = (metadata.controls || []).map(control => {
    const checkbox = control.type === 'checkbox' && typeof control.defaultValue === 'boolean';
    const numeric = ['range', 'number'].includes(control.type) &&
      [control.min, control.step, control.defaultValue].every(Number.isFinite) &&
      ((control.type === 'number' && control.max === undefined) ||
        (Number.isFinite(control.max) && control.min < control.max && control.defaultValue <= control.max)) &&
      control.step > 0 && control.defaultValue >= control.min &&
      ['minLabel', 'maxLabel'].every(key => control[key] === undefined || typeof control[key] === 'string');
    if ((!checkbox && !numeric) || typeof control.key !== 'string' || !/^[a-z][a-zA-Z0-9]*$/.test(control.key) ||
      typeof control.label !== 'string') {
      throw new TypeError('Invalid renderer control');
    }
    return Object.freeze({...control});
  });
  if (new Set(controls.map(control => control.key)).size !== controls.length) {
    throw new TypeError('Duplicate renderer control key');
  }
  registry.set(id, Object.freeze({id, Renderer, label: metadata.label || id, description: metadata.description || '',
    usesPriority: metadata.usesPriority === true,
    ...(controls.length && {controls: Object.freeze(controls)})}));
}

/**
 * List renderer choices without exposing mutable registry entries.
 * @returns {Object[]} Copies of {id, label, description, usesPriority, controls?}; no side effects.
 */
export function externalLabelRenderers() {
  return [...registry.values()].map(({id, label, description, usesPriority, controls}) => ({id, label, description, usesPriority,
    ...(controls && {controls: controls.map(control => ({...control}))})}));
}

/** Resolve a registered renderer, throwing for unknown IDs. @private */
export function externalLabelRendererDefinition(id) {
  const definition = registry.get(id);
  if (!definition) { throw new Error(`Unknown external label renderer '${id}'`); }
  return definition;
}

registerExternalLabelRenderer('adaptive', LabelRendererAdaptive, {label: 'Adaptive'});
registerExternalLabelRenderer('classic', LabelRendererClassic, {label: 'Classic'});
