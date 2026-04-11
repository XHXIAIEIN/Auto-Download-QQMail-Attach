export function el(tag, opts = {}, ...children) {
  const elem = document.createElement(tag);
  if (opts.className) elem.className = opts.className;
  if (opts.id) elem.id = opts.id;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) elem.setAttribute(k, v);
  }
  if (opts.events) {
    for (const [k, v] of Object.entries(opts.events)) elem.addEventListener(k, v);
  }

  const allChildren = [...(opts.children || []), ...children];
  for (const child of allChildren) {
    if (typeof child === 'string') {
      elem.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      elem.appendChild(child);
    }
  }

  return elem;
}

export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function remove(selectorOrElement) {
  if (typeof selectorOrElement === 'string') {
    qsa(selectorOrElement).forEach(el => el.remove());
  } else if (selectorOrElement?.remove) {
    selectorOrElement.remove();
  }
}
