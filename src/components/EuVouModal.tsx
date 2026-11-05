import { useEffect, useState } from 'react';
import type { S2REvent, User } from '../domain/types';
import { dataUrlToBlob, euVouArt, shareOrDownload } from '../lib/art';
import { SITE } from '../lib/brand';
import { trackEuVouShare } from '../data/store';
import { IconShare, Modal, useToast } from './ui';

type Circle = 'foto' | 'enviada' | 'iniciais';

/**
 * Abre logo depois do "Eu vou": gera a arte para os stories e os grupos.
 * A foto ou brasão enviado aqui só é usado nesta arte; não fica salvo no perfil.
 */
export function EuVouModal({ ev, me, onClose }: { ev: S2REvent; me: User; onClose: () => void }) {
  const toast = useToast();
  const [circle, setCircle] = useState<Circle>(me.photoUrl ? 'foto' : 'iniciais');
  const [upload, setUpload] = useState<string>();
  const [art, setArt] = useState<string | null>(null);

  const initials = me.name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const circleUrl = circle === 'foto' ? me.photoUrl : circle === 'enviada' ? upload : undefined;

  useEffect(() => {
    let alive = true;
    setArt(null);
    euVouArt({ event: ev, circleUrl, initials }).then((u) => alive && setArt(u));
    return () => {
      alive = false;
    };
  }, [ev, circleUrl, initials]);

  const onFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setUpload(r.result as string);
      setCircle('enviada');
    };
    r.readAsDataURL(f);
  };

  const share = async () => {
    if (!art) return;
    trackEuVouShare(ev.id);
    const text = `Eu vou ao ${ev.name}! E você? Veja a agenda em ${SITE}/evento/${ev.slug}`;
    const r = await shareOrDownload(dataUrlToBlob(art), `eu-vou-${ev.slug}.png`, text);
    toast(r === 'shared' ? 'Arte compartilhada.' : r === 'demo' ? 'No site, abre o WhatsApp e o Instagram. Aqui: toque e segure a imagem para salvar.' : 'Arte baixada. Poste nos stories e mande nos grupos.');
  };

  return (
    <Modal title="Sua arte “Eu vou”" onClose={onClose}>
      <p style={{ margin: '0 0 10px' }}>Poste nos stories e mande nos grupos para chamar a turma.</p>
      <fieldset>
        <legend>No círculo</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
          {me.photoUrl && (
            <label className="check">
              <input type="radio" name="circ" checked={circle === 'foto'} onChange={() => setCircle('foto')} />
              Minha foto
            </label>
          )}
          {upload && (
            <label className="check">
              <input type="radio" name="circ" checked={circle === 'enviada'} onChange={() => setCircle('enviada')} />
              Imagem enviada
            </label>
          )}
          <label className="check">
            <input type="radio" name="circ" checked={circle === 'iniciais'} onChange={() => setCircle('iniciais')} />
            Minhas iniciais
          </label>
        </div>
        <label className="btn small" style={{ cursor: 'pointer', justifySelf: 'start' }}>
          Usar outra foto ou o brasão do meu motoclube
          <input id="euvou-file" type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </fieldset>
      {art ? (
        <img className="modal-img" src={art} alt={`Arte Eu vou do ${ev.name}`} style={{ maxHeight: '48vh' }} />
      ) : (
        <p className="hint">Gerando a arte…</p>
      )}
      <button className="btn primary block" onClick={share} disabled={!art}>
        <IconShare /> Compartilhar arte
      </button>
    </Modal>
  );
}
