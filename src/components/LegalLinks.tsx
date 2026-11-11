import { Link } from '@chakra-ui/react';

/** Links to the privacy policy and terms, plain pages on the website outside the app. */
export const PRIVACY_URL = `${import.meta.env.BASE_URL}privacy/`;
export const TERMS_URL = `${import.meta.env.BASE_URL}terms/`;
// The marketing homepage at the site root (pulsarworkouts.app/ in production, the preview's own
// root on a PR preview).
export const HOMEPAGE_URL = import.meta.env.BASE_URL;

/** "Terms · Privacy", for the small print next to sign-in and purchase buttons. */
const LegalLinks = () => (
  <>
    <Link href={TERMS_URL} textDecoration="underline">Terms</Link>
    {' · '}
    <Link href={PRIVACY_URL} textDecoration="underline">Privacy</Link>
  </>
);

export default LegalLinks;
