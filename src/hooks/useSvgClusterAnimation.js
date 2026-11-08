import { useLayoutEffect, useRef } from 'react';

const DURATION = 320;
const memberKey = member => member.id ?? member;

function currentPosition(record) {
  const progress = record.animation?.effect?.getComputedTiming().progress;
  if (progress == null) return { x: record.x, y: record.y };
  return {
    x: record.from.x + (record.x - record.from.x) * progress,
    y: record.from.y + (record.y - record.from.y) * progress,
  };
}

// SVG animations run in the browser without rendering country paths every frame.
// Members identify the old parent on split and the new parent on merge.
export function useSvgClusterAnimation(markers, scope) {
  const layerRef = useRef(null);
  const previousRef = useRef({ scope: null, records: [] });
  const animationsRef = useRef([]);
  const ghostsRef = useRef([]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const previous = previousRef.current;
    const positions = new Map(previous.records.map(record => [record, currentPosition(record)]));
    animationsRef.current.forEach(animation => animation.cancel());
    ghostsRef.current.forEach(ghost => ghost.remove());
    animationsRef.current = [];
    ghostsRef.current = [];

    const nodes = new Map([...layer.querySelectorAll(':scope > [data-svg-cluster-key]')]
      .map(node => [node.dataset.svgClusterKey, node]));
    const records = markers.flatMap(marker => {
      const element = nodes.get(marker.key);
      return element ? [{ ...marker, element }] : [];
    });
    const animate = previous.scope === scope
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (animate) {
      const previousOwners = new Map();
      previous.records.forEach(record => record.members.forEach(member => previousOwners.set(memberKey(member), record)));
      const nextOwners = new Map();
      records.forEach(record => record.members.forEach(member => nextOwners.set(memberKey(member), record)));
      const nextKeys = new Set(records.map(record => record.key));

      for (const record of records) {
        if (typeof record.element.animate !== 'function') continue;
        const parents = new Set(record.members.map(member => previousOwners.get(memberKey(member))).filter(Boolean));
        if (!parents.size) continue;
        const parent = parents.values().next().value;
        const from = parents.size === 1 ? positions.get(parent) : { x: record.x, y: record.y };
        const changedGroup = parents.size !== 1 || parent.key !== record.key;
        if (!changedGroup && from.x === record.x && from.y === record.y) continue;
        record.from = from;
        record.animation = record.element.animate([
          { transform: `translate(${from.x}px, ${from.y}px)`, opacity: changedGroup ? 0.35 : 1 },
          { transform: `translate(${record.x}px, ${record.y}px)`, opacity: 1 },
        ], { duration: DURATION, easing: 'ease-out' });
        animationsRef.current.push(record.animation);
      }

      for (const record of previous.records) {
        if (nextKeys.has(record.key) || typeof record.element.animate !== 'function') continue;
        const children = new Set(record.members.map(member => nextOwners.get(memberKey(member))).filter(Boolean));
        if (!children.size) continue;
        const from = positions.get(record);
        const target = children.size === 1 ? children.values().next().value : from;
        const ghost = record.element.cloneNode(true);
        ghost.removeAttribute('data-svg-cluster-key');
        ghost.removeAttribute('data-cluster-count');
        ghost.setAttribute('data-map-cluster-exiting', 'true');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.pointerEvents = 'none';
        ghost.querySelectorAll('[data-marker-interactive]').forEach(node => node.remove());
        layer.appendChild(ghost);
        ghostsRef.current.push(ghost);
        const animation = ghost.animate([
          { transform: `translate(${from.x}px, ${from.y}px)`, opacity: 1 },
          { transform: `translate(${target.x}px, ${target.y}px)`, opacity: 0 },
        ], { duration: DURATION, easing: 'ease-out', fill: 'forwards' });
        animation.onfinish = () => ghost.remove();
        animationsRef.current.push(animation);
      }
    }
    previousRef.current = { scope, records };
  }, [markers, scope]);

  useLayoutEffect(() => () => {
    animationsRef.current.forEach(animation => animation.cancel());
    ghostsRef.current.forEach(ghost => ghost.remove());
    previousRef.current = { scope: null, records: [] };
  }, []);

  return layerRef;
}
