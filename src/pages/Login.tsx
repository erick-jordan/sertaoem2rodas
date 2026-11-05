import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { UF } from '../domain/types';
import { CIDADES_DISPONIVEIS } from '../domain/geo';
import { DEMO_OTP, getState, normalizePhone, signUp, toggleGoing, verifyCode } from '../data/store';
import { useTitle, useToast } from '../components/ui';

/**
 * Entrar pelo WhatsApp: telefone → código de 6 números → (se novo) cadastro rápido.
 * Mesmo fluxo para motociclista e organizador; o organizador só informa o @ do Instagram a mais.
 */
export function LoginPage() {
  useTitle('Entrar');
  const [params] = useSearchParams();
  const volta = params.get('volta') ?? '/';
  const acao = params.get('acao');
  const asOrganizer = params.get('perfil') === 'organizador';
  const nav = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<'phone' | 'code' | 'signup'>('phone');
  const [raw, setRaw] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const finish = () => {
    // completa a ação que levou ao login
    const m = volta.match(/^\/evento\/(.+)$/);
    if (acao === 'euvou' && m) {
      const s = getState();
      const ev = s.events.find((e) => e.slug === m[1]);
      if (ev && !s.going.some((g) => g.eventId === ev.id && g.userId === s.sessionUserId)) {
        toggleGoing(ev.id);
        toast('Pronto: o organizador sabe que você vai.');
      }
    }
    nav(volta, { replace: true, state: acao === 'euvou' ? { euVouArt: true } : undefined });
  };

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const p = normalizePhone(raw);
    if (!p) return setErr('Digite o celular com DDD, 11 números. Ex.: (83) 99999-0000.');
    setErr('');
    setPhone(p);
    setStep('code');
  };

  const checkCode = (e: React.FormEvent) => {
    e.preventDefault();
    const r = verifyCode(phone, code);
    if (!r.ok) return setErr(r.error);
    setErr('');
    if (r.user) {
      toast(`Olá, ${r.user.name.split(' ')[0]}.`);
      finish();
    } else setStep('signup');
  };

  const pretty = phone ? `(${phone.slice(3, 5)}) ${phone.slice(5, 10)}-${phone.slice(10)}` : '';

  return (
    <div className="page">
      <h1>{step === 'signup' ? 'Complete seu cadastro' : 'Entrar com WhatsApp'}</h1>
      {acao === 'checkin' && <p className="notice warn">Entre ou cadastre-se para concluir o check-in. Leva menos de um minuto.</p>}

      {step === 'phone' && (
        <form className="form" onSubmit={sendCode} noValidate>
          <p className="lede">Mandamos um código de 6 números para o seu WhatsApp. Sem senha.</p>
          <div className="field">
            <label htmlFor="ph">Seu WhatsApp com DDD</label>
            <input id="ph" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(83) 99999-0000" value={raw} onChange={(e) => setRaw(e.target.value)} autoFocus />
            {err && <span className="err" role="alert">{err}</span>}
          </div>
          <button className="btn primary block" type="submit">
            Receber código no WhatsApp
          </button>
          <p className="hint">Para testar com uma conta existente: (83) 90000-0014 é a Ana Paula, motociclista.</p>
        </form>
      )}

      {step === 'code' && (
        <form className="form" onSubmit={checkCode} noValidate>
          <p className="lede">
            Digite o código enviado para <strong>{pretty}</strong>.{' '}
            <button type="button" className="link-btn" onClick={() => setStep('phone')}>
              Trocar número
            </button>
          </p>
          <p className="notice">Protótipo: o código é sempre {DEMO_OTP}.</p>
          <div className="field">
            <label htmlFor="otp">Código</label>
            <input id="otp" className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
            {err && <span className="err" role="alert">{err}</span>}
          </div>
          <button className="btn primary block" type="submit" disabled={code.length !== 6}>
            Confirmar
          </button>
        </form>
      )}

      {step === 'signup' && <SignupForm phone={phone} asOrganizer={asOrganizer} onDone={finish} />}
    </div>
  );
}

function SignupForm({ phone, asOrganizer, onDone }: { phone: string; asOrganizer: boolean; onDone: () => void }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoOk, setPhotoOk] = useState(false);
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [insta, setInsta] = useState('');
  const [cpf, setCpf] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (name.trim().split(' ').length < 2) er.name = 'Digite nome e sobrenome.';
    if (!CIDADES_DISPONIVEIS.includes(city)) er.city = 'Escolha a cidade na lista (cidade/UF).';
    if (photo && !photoOk) er.photo = 'Autorize o uso da foto ou remova-a.';
    if (asOrganizer && !/^@?[\w.]{2,30}$/.test(insta.trim())) er.insta = 'Informe o @ do Instagram (seu ou do evento).';
    if (!adult) er.adult = 'O cadastro é só para maiores de 18 anos.';
    if (!terms) er.terms = 'É preciso aceitar os Termos e a Política de Privacidade.';
    setErr(er);
    if (Object.keys(er).length) return;
    const [c, uf] = city.split('/');
    signUp({
      phone, name, city: c, uf: uf as UF, photoUrl: photo, asOrganizer,
      instagram: asOrganizer ? '@' + insta.trim().replace(/^@/, '') : undefined, cpf: cpf || undefined,
    });
    onDone();
  };

  const onFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <p className="lede">Número confirmado. Faltam só estes dados.</p>
      <div className="field">
        <label htmlFor="nm">Nome</label>
        <input id="nm" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        {err.name && <span className="err">{err.name}</span>}
      </div>
      <div className="field">
        <label htmlFor="ct">Cidade de origem</label>
        <input id="ct" type="text" list="cidades" placeholder="Comece a digitar: Campina Grande/PB" value={city} onChange={(e) => setCity(e.target.value)} />
        <datalist id="cidades">
          {CIDADES_DISPONIVEIS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <span className="help">Usada para mostrar ao organizador quem veio de mais longe. Não pegamos sua localização.</span>
        {err.city && <span className="err">{err.city}</span>}
      </div>
      {asOrganizer && (
        <div className="row2">
          <div className="field">
            <label htmlFor="ig">Instagram</label>
            <input id="ig" type="text" placeholder="@seuevento" value={insta} onChange={(e) => setInsta(e.target.value)} />
            {err.insta && <span className="err">{err.insta}</span>}
          </div>
          <div className="field">
            <label htmlFor="cpf">
              CPF <span className="opt">(opcional)</span>
            </label>
            <input id="cpf" type="text" inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} />
          </div>
        </div>
      )}
      <div className="field">
        <span className="lbl">
          Foto <span className="opt">(opcional)</span>
        </span>
        <div className="who">
          {photo && <img className="avatar" src={photo} alt="Sua foto" />}
          <label className="btn small" style={{ cursor: 'pointer' }}>
            {photo ? 'Trocar foto' : 'Escolher foto'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {photo && (
            <button type="button" className="link-btn" onClick={() => setPhoto(undefined)}>
              Remover
            </button>
          )}
        </div>
        {photo && (
          <label className="check">
            <input type="checkbox" checked={photoOk} onChange={(e) => setPhotoOk(e.target.checked)} />
            <span>Autorizo o uso da foto nas artes que eu gerar e para os organizadores dos eventos em que eu marcar "Eu vou" ou fizer check-in.</span>
          </label>
        )}
        {err.photo && <span className="err">{err.photo}</span>}
      </div>
      <label className="check">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        <span>Declaro ter 18 anos ou mais.</span>
      </label>
      {err.adult && <span className="err">{err.adult}</span>}
      <label className="check">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        <span>
          Li e aceito os{' '}
          <Link to="/termos" target="_blank">
            Termos de Uso
          </Link>{' '}
          e a{' '}
          <Link to="/privacidade" target="_blank">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      {err.terms && <span className="err">{err.terms}</span>}
      <button className="btn primary block" type="submit">
        Criar conta
      </button>
    </form>
  );
}
