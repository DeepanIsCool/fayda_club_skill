import { useEffect, useState } from 'react';
import translations from '../../locales/translations.json';

const useTranslation = () => {
  const [t, setT] = useState(translations.en);

  useEffect(() => {
    const isChinese = process.env.NEXT_PUBLIC_IS_CHINESE === 'true';
    if (isChinese) {
      setT(translations.zh);
    } else {
      setT(translations.en);
    }
  }, []);

  return t;
};

export default useTranslation;