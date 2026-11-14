import { spanishLeftIn } from './english';

describe('spanishLeftIn', () => {
  const html = (markup: string) => {
    const element = document.createElement('div');
    element.innerHTML = markup;
    return element;
  };

  it('finds Spanish in text and in the attributes screen readers and fields show', () => {
    const element = html(
      '<p>Your Groups</p><button aria-label="Quitar a Luke">Remove</button>' +
        '<textarea placeholder="Escribe un mensaje…"></textarea><p>Cargando…</p>',
    );

    expect(spanishLeftIn(element)).toEqual(['quitar', 'un', 'mensaje', 'cargando']);
  });

  it('finds nothing in English copy, nor in text marked as Spanish on purpose', () => {
    const element = html('<p>Sign in to see your Groups.</p><span lang="es">Español</span>');

    expect(spanishLeftIn(element)).toEqual([]);
  });
});
