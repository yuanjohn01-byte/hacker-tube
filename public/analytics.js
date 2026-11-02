// Keep preview/development visits out of production analytics.
if (location.hostname === 'hacker-tube.org' || location.hostname === 'www.hacker-tube.org') {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-59MT0DEK42');
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=G-59MT0DEK42';
  document.head.appendChild(tag);
}
