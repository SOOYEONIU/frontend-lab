export function query<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
}

export function cloneTemplate<T extends HTMLElement>(id: string): T {
  const template = query<HTMLTemplateElement>(`#${id}`);
  const element = template.content.firstElementChild;
  if (!element) throw new Error(`Empty UI template: ${id}`);
  return element.cloneNode(true) as T;
}

export function setText(element: HTMLElement, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}

export function createTextElement(
  tag: "span" | "div",
  className: string,
  text: string,
): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}
