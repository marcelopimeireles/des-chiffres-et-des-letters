import React, { useState } from 'react';
import { useTranslation } from '../i18n';

export default function ShareResult({ score }: { score: number }) {
  const t = useTranslation();
  const [status, setStatus] = useState('');
  const url = window.location.origin + '/';
  const message = t(
    'J’ai marqué ' + score + ' points à Des Chiffres et des Lettres ! À vous de jouer.',
    'I scored ' + score + ' points in Des Chiffres et des Lettres! Your turn.',
    'Fiz ' + score + ' pontos em Des Chiffres et des Lettres! Agora é a sua vez.'
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message + ' ' + url);
      setStatus(t('Copié !', 'Copied!', 'Copiado!'));
    } catch {
      setStatus(t('Copiez le texte ci-dessous.', 'Copy the text below.', 'Copie o texto abaixo.'));
    }
  };
  const share = async () => {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: 'Des Chiffres et des Lettres', text: message, url }); }
    catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) await copy();
    }
  };
  const encoded = encodeURIComponent(message + ' ' + url);
  return <section aria-label={t('Partager le résultat', 'Share result', 'Partilhar resultado')}>
    <h3>{t('Défiez vos amis', 'Challenge your friends', 'Desafie os seus amigos')}</h3>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center'}}>
      <button type="button" className="button button--primary" onClick={() => void share()}>{t('Partager', 'Share', 'Partilhar')}</button>
      <button type="button" className="text-button" onClick={() => void copy()}>{t('Copier le résultat', 'Copy result', 'Copiar resultado')}</button>
      <a href={'https://wa.me/?text=' + encoded} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a href={'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a href={'https://twitter.com/intent/tweet?text=' + encoded} target="_blank" rel="noopener noreferrer">X</a>
      <a href={'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(message)} target="_blank" rel="noopener noreferrer">Telegram</a>
    </div>
    <p>{message} {url}</p>
    <p role="status">{status}</p>
  </section>;
}
