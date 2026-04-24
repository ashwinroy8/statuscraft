"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  Zap,
  Mic,
  Bot,
  ShoppingCart,
  Sparkles,
  BarChart2,
  Check,
  ArrowRight,
  Star,
  Globe,
  ChevronDown,
} from "lucide-react";

// ── TRANSLATIONS ────────────────────────────────────────────────────────────

type LangCode = "en" | "hi" | "ta" | "te" | "mr" | "bn" | "gu" | "kn" | "ml" | "pa";

interface Translations {
  heroLine1: string;
  heroLine2: string;
  heroSub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  badge1: string;
  badge2: string;
  badge3: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  startFree: string;
  startPro: string;
}

const TRANSLATIONS: Record<LangCode, Translations> = {
  en: {
    heroLine1: "Your business speaks.",
    heroLine2: "We turn it into WhatsApp Status posts.",
    heroSub: "Send a 10-second voice note. Get 3 stunning posts — in Hindi, Hinglish, or English — ready to go live. India's small businesses deserve marketing that works like they do.",
    ctaPrimary: "Start for free",
    ctaSecondary: "Watch how it works",
    badge1: "No credit card",
    badge2: "Hindi & English",
    badge3: "Free forever plan",
    step1Title: "Speak your offer",
    step1Desc: "Record a 10-second voice note on WhatsApp. Hindi, Hinglish, Tamil — whatever feels natural.",
    step2Title: "AI creates 3 posts",
    step2Desc: "Claude AI writes the copy, generates the image, adds your logo and brand colours automatically.",
    step3Title: "Approve & go live",
    step3Desc: "Reply APPROVE on WhatsApp. Your status goes live. Customers start replying.",
    startFree: "Start Free",
    startPro: "Start Pro Trial",
  },
  hi: {
    heroLine1: "आपका व्यापार बोलता है।",
    heroLine2: "हम इसे WhatsApp Status पोस्ट में बदलते हैं।",
    heroSub: "10 सेकंड का voice note भेजें। 3 शानदार पोस्ट मिलें — हिंदी, Hinglish या अंग्रेजी में — तुरंत live होने के लिए तैयार।",
    ctaPrimary: "मुफ्त शुरू करें",
    ctaSecondary: "देखें कैसे काम करता है",
    badge1: "कोई क्रेडिट कार्ड नहीं",
    badge2: "हिंदी और अंग्रेजी",
    badge3: "हमेशा के लिए मुफ्त प्लान",
    step1Title: "अपना ऑफर बोलें",
    step1Desc: "WhatsApp पर 10 सेकंड का voice note रिकॉर्ड करें। हिंदी, Hinglish, तमिल — जो भी स्वाभाविक लगे।",
    step2Title: "AI 3 पोस्ट बनाता है",
    step2Desc: "Claude AI कॉपी लिखता है, इमेज बनाता है, आपका लोगो और ब्रांड रंग अपने आप जोड़ता है।",
    step3Title: "Approve करें और live जाएं",
    step3Desc: "WhatsApp पर APPROVE reply करें। आपका status live हो जाता है। ग्राहक reply करने लगते हैं।",
    startFree: "मुफ्त शुरू करें",
    startPro: "Pro Trial शुरू करें",
  },
  ta: {
    heroLine1: "உங்கள் தொழில் பேசுகிறது.",
    heroLine2: "நாங்கள் அதை WhatsApp Status பதிவுகளாக மாற்றுகிறோம்.",
    heroSub: "10 நொடி voice note அனுப்புங்கள். 3 அற்புதமான பதிவுகள் பெறுங்கள் — தமிழ், Hinglish அல்லது ஆங்கிலத்தில் — உடனே live ஆக தயார்.",
    ctaPrimary: "இலவசமாக தொடங்குங்கள்",
    ctaSecondary: "எப்படி வேலை செய்கிறது என்று பாருங்கள்",
    badge1: "கிரெடிட் கார்டு தேவையில்லை",
    badge2: "தமிழ் மற்றும் ஆங்கிலம்",
    badge3: "என்றென்றும் இலவச திட்டம்",
    step1Title: "உங்கள் சலுகையை சொல்லுங்கள்",
    step1Desc: "WhatsApp-ல் 10 நொடி voice note record செய்யுங்கள். தமிழ், Hinglish — எதுவாக வேண்டுமானாலும்.",
    step2Title: "AI 3 பதிவுகள் உருவாக்குகிறது",
    step2Desc: "Claude AI copy எழுதுகிறது, image உருவாக்குகிறது, உங்கள் logo மற்றும் brand நிறங்களை தானாகவே சேர்க்கிறது.",
    step3Title: "Approve செய்து live ஆகுங்கள்",
    step3Desc: "WhatsApp-ல் APPROVE என்று reply செய்யுங்கள். உங்கள் status live ஆகிவிடும். வாடிக்கையாளர்கள் reply செய்யத் தொடங்குவார்கள்.",
    startFree: "இலவசமாக தொடங்குங்கள்",
    startPro: "Pro Trial தொடங்குங்கள்",
  },
  te: {
    heroLine1: "మీ వ్యాపారం మాట్లాడుతుంది.",
    heroLine2: "మేము దానిని WhatsApp Status పోస్ట్‌లుగా మారుస్తాము.",
    heroSub: "10 సెకన్ల voice note పంపండి. 3 అద్భుతమైన పోస్ట్‌లు పొందండి — తెలుగు, Hinglish లేదా ఇంగ్లీష్‌లో — వెంటనే live కి సిద్ధంగా.",
    ctaPrimary: "ఉచితంగా ప్రారంభించండి",
    ctaSecondary: "ఎలా పని చేస్తుందో చూడండి",
    badge1: "క్రెడిట్ కార్డు అవసరం లేదు",
    badge2: "తెలుగు & ఇంగ్లీష్",
    badge3: "ఎప్పటికీ ఉచిత ప్లాన్",
    step1Title: "మీ ఆఫర్ చెప్పండి",
    step1Desc: "WhatsApp లో 10 సెకన్ల voice note రికార్డ్ చేయండి. తెలుగు, Hinglish — ఏదైనా సరే.",
    step2Title: "AI 3 పోస్ట్‌లు సృష్టిస్తుంది",
    step2Desc: "Claude AI కాపీ రాస్తుంది, ఇమేజ్ తయారు చేస్తుంది, మీ లోగో మరియు బ్రాండ్ రంగులు స్వయంచాలకంగా జోడిస్తుంది.",
    step3Title: "Approve చేసి live అవ్వండి",
    step3Desc: "WhatsApp లో APPROVE అని reply చేయండి. మీ status live అవుతుంది. కస్టమర్లు reply చేయడం మొదలుపెడతారు.",
    startFree: "ఉచితంగా ప్రారంభించండి",
    startPro: "Pro Trial ప్రారంభించండి",
  },
  mr: {
    heroLine1: "तुमचा व्यवसाय बोलतो.",
    heroLine2: "आम्ही त्याला WhatsApp Status पोस्ट बनवतो.",
    heroSub: "10 सेकंदाची voice note पाठवा. 3 अप्रतिम पोस्ट मिळवा — मराठी, Hinglish किंवा इंग्रजीत — लगेच live होण्यासाठी तयार.",
    ctaPrimary: "मोफत सुरू करा",
    ctaSecondary: "कसे काम करते ते पाहा",
    badge1: "क्रेडिट कार्ड नको",
    badge2: "मराठी आणि इंग्रजी",
    badge3: "कायमचा मोफत प्लान",
    step1Title: "तुमची ऑफर सांगा",
    step1Desc: "WhatsApp वर 10 सेकंदाची voice note रेकॉर्ड करा. मराठी, Hinglish, हिंदी — जे नैसर्गिक वाटेल ते.",
    step2Title: "AI 3 पोस्ट तयार करते",
    step2Desc: "Claude AI कॉपी लिहितो, इमेज तयार करतो, तुमचा लोगो आणि ब्रँड रंग आपोआप जोडतो.",
    step3Title: "Approve करा आणि live व्हा",
    step3Desc: "WhatsApp वर APPROVE reply करा. तुमचा status live होतो. ग्राहक reply करू लागतात.",
    startFree: "मोफत सुरू करा",
    startPro: "Pro Trial सुरू करा",
  },
  bn: {
    heroLine1: "আপনার ব্যবসা কথা বলে।",
    heroLine2: "আমরা এটিকে WhatsApp Status পোস্টে পরিণত করি।",
    heroSub: "১০ সেকেন্ডের voice note পাঠান। ৩টি দুর্দান্ত পোস্ট পান — বাংলা, Hinglish বা ইংরেজিতে — সাথে সাথে live হওয়ার জন্য প্রস্তুত।",
    ctaPrimary: "বিনামূল্যে শুরু করুন",
    ctaSecondary: "কীভাবে কাজ করে দেখুন",
    badge1: "ক্রেডিট কার্ড লাগবে না",
    badge2: "বাংলা ও ইংরেজি",
    badge3: "চিরকালের জন্য বিনামূল্যে প্ল্যান",
    step1Title: "আপনার অফার বলুন",
    step1Desc: "WhatsApp-এ ১০ সেকেন্ডের voice note রেকর্ড করুন। বাংলা, Hinglish — যা স্বাভাবিক মনে হয়।",
    step2Title: "AI ৩টি পোস্ট তৈরি করে",
    step2Desc: "Claude AI কপি লেখে, ছবি তৈরি করে, আপনার লোগো এবং ব্র্যান্ড রঙ স্বয়ংক্রিয়ভাবে যোগ করে।",
    step3Title: "Approve করুন এবং live হন",
    step3Desc: "WhatsApp-এ APPROVE reply করুন। আপনার status live হয়ে যায়। গ্রাহকরা reply করতে শুরু করেন।",
    startFree: "বিনামূল্যে শুরু করুন",
    startPro: "Pro Trial শুরু করুন",
  },
  gu: {
    heroLine1: "તમારો ધંધો બોલે છે.",
    heroLine2: "અમે તેને WhatsApp Status પોસ્ટ બનાવીએ છીએ.",
    heroSub: "10 સેકન્ડની voice note મોકલો. 3 અદ્ભુત પોસ્ટ મેળવો — ગુજરાતી, Hinglish અથવા અંગ્રેજીમાં — તરત live થવા માટે તૈયાર.",
    ctaPrimary: "મફતમાં શરૂ કરો",
    ctaSecondary: "કેવી રીતે કામ કરે છે જુઓ",
    badge1: "ક્રેડિટ કાર્ડ નહીં",
    badge2: "ગુજરાતી અને અંગ્રેજી",
    badge3: "હંમેશ માટે મફત પ્લાન",
    step1Title: "તમારી ઓફર બોલો",
    step1Desc: "WhatsApp પર 10 સેકન્ડની voice note રેકોર્ડ કરો. ગુજરાતી, Hinglish — જે સ્વાભાવિક લાગે.",
    step2Title: "AI 3 પોસ્ટ બનાવે છે",
    step2Desc: "Claude AI કોપી લખે છે, ઇમેજ બનાવે છે, તમારો લોગો અને બ્રાન્ડ રંગ આપોઆપ ઉમેરે છે.",
    step3Title: "Approve કરો અને live જાઓ",
    step3Desc: "WhatsApp પર APPROVE reply કરો. તમારો status live થઈ જાય છે. ગ્રાહકો reply કરવા લાગે છે.",
    startFree: "મફતમાં શરૂ કરો",
    startPro: "Pro Trial શરૂ કરો",
  },
  kn: {
    heroLine1: "ನಿಮ್ಮ ವ್ಯವಸಾಯ ಮಾತನಾಡುತ್ತದೆ.",
    heroLine2: "ನಾವು ಅದನ್ನು WhatsApp Status ಪೋಸ್ಟ್‌ಗಳನ್ನಾಗಿ ಮಾಡುತ್ತೇವೆ.",
    heroSub: "10 ಸೆಕೆಂಡ್ voice note ಕಳುಹಿಸಿ. 3 ಅದ್ಭುತ ಪೋಸ್ಟ್‌ಗಳನ್ನು ಪಡೆಯಿರಿ — ಕನ್ನಡ, Hinglish ಅಥವಾ ಇಂಗ್ಲೀಷ್‌ನಲ್ಲಿ — ತಕ್ಷಣ live ಆಗಲು ಸಿದ್ಧ.",
    ctaPrimary: "ಉಚಿತವಾಗಿ ಪ್ರಾರಂಭಿಸಿ",
    ctaSecondary: "ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ನೋಡಿ",
    badge1: "ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ ಬೇಡ",
    badge2: "ಕನ್ನಡ ಮತ್ತು ಇಂಗ್ಲೀಷ್",
    badge3: "ಯಾವಾಗಲೂ ಉಚಿತ ಯೋಜನೆ",
    step1Title: "ನಿಮ್ಮ ಆಫರ್ ಹೇಳಿ",
    step1Desc: "WhatsApp ನಲ್ಲಿ 10 ಸೆಕೆಂಡ್ voice note ರೆಕಾರ್ಡ್ ಮಾಡಿ. ಕನ್ನಡ, Hinglish — ಯಾವುದು ಸ್ವಾಭಾವಿಕ ಅನ್ನಿಸುತ್ತದೆ.",
    step2Title: "AI 3 ಪೋಸ್ಟ್ ತಯಾರಿಸುತ್ತದೆ",
    step2Desc: "Claude AI ಕಾಪಿ ಬರೆಯುತ್ತದೆ, ಇಮೇಜ್ ಮಾಡುತ್ತದೆ, ನಿಮ್ಮ ಲೋಗೋ ಮತ್ತು ಬ್ರ್ಯಾಂಡ್ ಬಣ್ಣಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸೇರಿಸುತ್ತದೆ.",
    step3Title: "Approve ಮಾಡಿ live ಆಗಿ",
    step3Desc: "WhatsApp ನಲ್ಲಿ APPROVE reply ಮಾಡಿ. ನಿಮ್ಮ status live ಆಗುತ್ತದೆ. ಗ್ರಾಹಕರು reply ಮಾಡಲು ಶುರು ಮಾಡುತ್ತಾರೆ.",
    startFree: "ಉಚಿತವಾಗಿ ಪ್ರಾರಂಭಿಸಿ",
    startPro: "Pro Trial ಪ್ರಾರಂಭಿಸಿ",
  },
  ml: {
    heroLine1: "നിങ്ങളുടെ ബിസിനസ് സംസാരിക്കുന്നു.",
    heroLine2: "ഞങ്ങൾ അത് WhatsApp Status പോസ്റ്റുകളാക്കുന്നു.",
    heroSub: "10 സെക്കൻഡ് voice note അയക്കൂ. 3 ആകർഷണീയ പോസ്റ്റുകൾ നേടൂ — മലയാളം, Hinglish അല്ലെങ്കിൽ ഇംഗ്ലീഷിൽ — ഉടൻ live ആകാൻ തയ്യാർ.",
    ctaPrimary: "സൗജന്യമായി ആരംഭിക്കൂ",
    ctaSecondary: "എങ്ങനെ പ്രവർത്തിക്കുന്നുവെന്ന് കാണൂ",
    badge1: "ക്രെഡിറ്റ് കാർഡ് വേണ്ട",
    badge2: "മലയാളം & ഇംഗ്ലീഷ്",
    badge3: "എക്കാലവും സൗജന്യ പ്ലാൻ",
    step1Title: "നിങ്ങളുടെ ഓഫർ പറയൂ",
    step1Desc: "WhatsApp-ൽ 10 സെക്കൻഡ് voice note റെക്കോർഡ് ചെയ്യൂ. മലയാളം, Hinglish — എന്ത് സ്വാഭാവികമായി തോന്നുന്നോ.",
    step2Title: "AI 3 പോസ്റ്റ് ഉണ്ടാക്കുന്നു",
    step2Desc: "Claude AI കോപ്പി എഴുതുന്നു, ഇമേജ് ഉണ്ടാക്കുന്നു, നിങ്ങളുടെ ലോഗോ, ബ്രാൻഡ് നിറങ്ങൾ സ്വയം ചേർക്കുന്നു.",
    step3Title: "Approve ചെയ്ത് live ആകൂ",
    step3Desc: "WhatsApp-ൽ APPROVE reply ചെയ്യൂ. നിങ്ങളുടെ status live ആകുന്നു. ഉപഭോക്താക്കൾ reply ചെയ്യാൻ തുടങ്ങുന്നു.",
    startFree: "സൗജന്യമായി ആരംഭിക്കൂ",
    startPro: "Pro Trial ആരംഭിക്കൂ",
  },
  pa: {
    heroLine1: "ਤੁਹਾਡਾ ਕਾਰੋਬਾਰ ਬੋਲਦਾ ਹੈ।",
    heroLine2: "ਅਸੀਂ ਇਸਨੂੰ WhatsApp Status ਪੋਸਟਾਂ ਵਿੱਚ ਬਦਲਦੇ ਹਾਂ।",
    heroSub: "10 ਸਕਿੰਟ ਦੀ voice note ਭੇਜੋ। 3 ਸ਼ਾਨਦਾਰ ਪੋਸਟਾਂ ਪ੍ਰਾਪਤ ਕਰੋ — ਪੰਜਾਬੀ, Hinglish ਜਾਂ ਅੰਗ੍ਰੇਜ਼ੀ ਵਿੱਚ — ਤੁਰੰਤ live ਹੋਣ ਲਈ ਤਿਆਰ।",
    ctaPrimary: "ਮੁਫ਼ਤ ਸ਼ੁਰੂ ਕਰੋ",
    ctaSecondary: "ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ ਦੇਖੋ",
    badge1: "ਕ੍ਰੈਡਿਟ ਕਾਰਡ ਨਹੀਂ",
    badge2: "ਪੰਜਾਬੀ ਅਤੇ ਅੰਗ੍ਰੇਜ਼ੀ",
    badge3: "ਹਮੇਸ਼ਾ ਲਈ ਮੁਫ਼ਤ ਯੋਜਨਾ",
    step1Title: "ਆਪਣੀ ਪੇਸ਼ਕਸ਼ ਦੱਸੋ",
    step1Desc: "WhatsApp ਤੇ 10 ਸਕਿੰਟ ਦੀ voice note ਰਿਕਾਰਡ ਕਰੋ। ਪੰਜਾਬੀ, Hinglish — ਜੋ ਵੀ ਕੁਦਰਤੀ ਲੱਗੇ।",
    step2Title: "AI 3 ਪੋਸਟਾਂ ਬਣਾਉਂਦਾ ਹੈ",
    step2Desc: "Claude AI ਕਾਪੀ ਲਿਖਦਾ ਹੈ, ਤਸਵੀਰ ਬਣਾਉਂਦਾ ਹੈ, ਤੁਹਾਡਾ ਲੋਗੋ ਅਤੇ ਬ੍ਰਾਂਡ ਰੰਗ ਆਪਣੇ ਆਪ ਜੋੜਦਾ ਹੈ।",
    step3Title: "Approve ਕਰੋ ਅਤੇ live ਜਾਓ",
    step3Desc: "WhatsApp ਤੇ APPROVE reply ਕਰੋ। ਤੁਹਾਡਾ status live ਹੋ ਜਾਂਦਾ ਹੈ। ਗਾਹਕ reply ਕਰਨ ਲੱਗਦੇ ਹਨ।",
    startFree: "ਮੁਫ਼ਤ ਸ਼ੁਰੂ ਕਰੋ",
    startPro: "Pro Trial ਸ਼ੁਰੂ ਕਰੋ",
  },
};

const LANG_NAMES: Record<LangCode, string> = {
  en: "English",
  hi: "हिंदी",
  ta: "தமிழ்",
  te: "తెలుగు",
  mr: "मराठी",
  bn: "বাংলা",
  gu: "ગુજરાતી",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  pa: "ਪੰਜਾਬੀ",
};

const REGION_TO_LANG: Record<string, LangCode> = {
  MH: "mr",
  TN: "ta",
  KA: "kn",
  KL: "ml",
  WB: "bn",
  AS: "bn",
  AP: "te",
  TS: "te",
  PB: "pa",
  GJ: "gu",
  UP: "hi",
  MP: "hi",
  RJ: "hi",
  BR: "hi",
  HR: "hi",
  DL: "hi",
  UK: "hi",
  HP: "hi",
  JH: "hi",
  CG: "hi",
  UA: "hi",
  CT: "hi",
};

// ── ANIMATED COUNTER ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { damping: 30, stiffness: 80 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, motionVal, value]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  return (
    <span ref={ref}>
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const [lang, setLang] = useState<LangCode>("en");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [showLangBanner, setShowLangBanner] = useState(false);
  const [autoDetectedLang, setAutoDetectedLang] = useState<LangCode | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-detect language
  useEffect(() => {
    const stored = localStorage.getItem("statuscraft_lang") as LangCode | null;
    if (stored && TRANSLATIONS[stored]) {
      setLang(stored);
      return;
    }
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        const region: string = data?.region_code ?? "";
        const detected: LangCode = REGION_TO_LANG[region] ?? "en";
        setLang(detected);
        localStorage.setItem("statuscraft_lang", detected);
        // Show "switch to English" banner only if a non-English language was auto-detected
        if (detected !== "en") {
          setAutoDetectedLang(detected);
          setShowLangBanner(true);
        }
      })
      .catch(() => {/* stay on en */});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLang(l: LangCode) {
    setLang(l);
    localStorage.setItem("statuscraft_lang", l);
    setLangDropdownOpen(false);
  }

  const t = TRANSLATIONS[lang];

  const businesses = [
    "Kirana Stores", "Restaurants", "Boutiques", "Sweet Shops",
    "Salons", "Coaching Classes", "Bakeries", "Jewellers",
    "Tailors", "Pharma Shops", "Tea Stalls", "Printing Shops",
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white" style={{ scrollBehavior: "smooth" }}>

      {/* ── LANGUAGE DETECTED BANNER ── */}
      <AnimatePresence>
        {showLangBanner && autoDetectedLang && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="bg-[#1e1e24] border border-[#3a3a45] rounded-2xl px-4 py-3.5 shadow-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#25D366]/15 flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-[#25D366]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-tight">
                  Showing in {LANG_NAMES[autoDetectedLang]}
                </p>
                <p className="text-xs text-[#8b8b9a] mt-0.5">
                  Based on your location
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    switchLang("en");
                    setShowLangBanner(false);
                  }}
                  className="text-xs font-semibold text-[#25D366] hover:text-white bg-[#25D366]/10 hover:bg-[#25D366]/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Switch to English
                </button>
                <button
                  onClick={() => setShowLangBanner(false)}
                  className="text-[#555562] hover:text-white transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-[#2a2a35] bg-[#0d0d0f]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-black fill-black" />
            </div>
            <span className="text-lg font-bold tracking-tight">StatusCraft</span>
          </div>

          {/* Right nav */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setLangDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-[#8b8b9a] hover:text-white border border-[#2a2a35] hover:border-[#3a3a45] px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{LANG_NAMES[lang]}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${langDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {langDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1 w-44 bg-[#16161a] border border-[#2a2a35] rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    {(Object.keys(LANG_NAMES) as LangCode[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => switchLang(l)}
                        className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between hover:bg-[#1e1e24] transition-colors ${lang === l ? "text-[#25D366]" : "text-[#8b8b9a]"}`}
                      >
                        {LANG_NAMES[l]}
                        {lang === l && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/login"
              className="text-sm text-[#8b8b9a] hover:text-white transition-colors hidden sm:inline"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              <span className="hidden sm:inline">Start Free</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(ellipse at center, #25D366 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
          {/* Left: copy */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-[#16161a] border border-[#2a2a35] text-sm text-[#8b8b9a] px-3 py-1.5 rounded-full mb-6"
            >
              <span>🤖</span>
              <span>Powered by Claude AI</span>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.h1
                key={lang + "-h1"}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-tight tracking-tight mb-5"
              >
                <span
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #a0a0b0 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {t.heroLine1}
                </span>
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #25D366 0%, #128C52 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {t.heroLine2}
                </span>
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.p
                key={lang + "-sub"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[#8b8b9a] text-lg leading-relaxed mb-8 max-w-md"
              >
                {t.heroSub}
              </motion.p>
            </AnimatePresence>

            {/* CTAs */}
            <AnimatePresence mode="wait">
              <motion.div
                key={lang + "-cta"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-wrap items-center gap-3 mb-6"
              >
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-bold px-6 py-3.5 rounded-xl text-base transition-all hover:shadow-[0_0_24px_rgba(37,211,102,0.4)]"
                >
                  {t.ctaPrimary} <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 border border-[#2a2a35] hover:border-[#3a3a45] text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors"
                >
                  {t.ctaSecondary}
                </a>
              </motion.div>
            </AnimatePresence>

            {/* Trust badges */}
            <AnimatePresence mode="wait">
              <motion.div
                key={lang + "-badges"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-wrap items-center gap-4 text-sm text-[#8b8b9a]"
              >
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#25D366]" /> {t.badge1}
                </span>
                <span className="text-[#2a2a35]">·</span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#25D366]" /> {t.badge2}
                </span>
                <span className="text-[#2a2a35]">·</span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#25D366]" /> {t.badge3}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Floating WhatsApp mock */}
          <div className="lg:flex justify-center hidden">
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-72 bg-[#16161a] border border-[#2a2a35] rounded-2xl overflow-hidden shadow-2xl"
              style={{ boxShadow: "0 20px 80px rgba(37,211,102,0.08), 0 8px 32px rgba(0,0,0,0.5)" }}
            >
              {/* Chat header */}
              <div className="bg-[#1e1e24] px-4 py-3 flex items-center gap-3 border-b border-[#2a2a35]">
                <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-black font-bold text-xs">
                  SC
                </div>
                <div>
                  <p className="text-sm font-semibold">StatusCraft Bot</p>
                  <p className="text-xs text-[#25D366]">● online</p>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-4 space-y-3 min-h-[260px]">
                <div className="flex justify-end">
                  <div className="bg-[#25D366]/20 border border-[#25D366]/30 rounded-xl rounded-br-sm px-3 py-2 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-[#25D366]" />
                      <div className="flex items-end gap-0.5">
                        {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
                          <motion.div
                            key={i}
                            className="w-0.5 bg-[#25D366] rounded-full"
                            animate={{ height: [`${h * 2}px`, `${h * 4}px`, `${h * 2}px`] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#8b8b9a]">0:08</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-[#1e1e24] border border-[#2a2a35] rounded-xl rounded-bl-sm px-3 py-2 max-w-[90%]">
                    <p className="text-xs text-white">
                      ✨ 3 posts created! Mango Pickle Launch — ready to approve
                    </p>
                    <p className="text-[10px] text-[#8b8b9a] mt-1">Reply APPROVE to go live</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Hindi", color: "#ff6b35" },
                    { label: "Hinglish", color: "#25D366" },
                    { label: "English", color: "#7c3aed" },
                  ].map((p, i) => (
                    <motion.div
                      key={p.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                      className="bg-[#0d0d0f] border border-[#2a2a35] rounded-lg px-3 py-2 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <span className="text-xs text-[#8b8b9a]">{p.label} variant</span>
                      </div>
                      <span className="text-[10px] bg-[#16161a] border border-[#2a2a35] px-1.5 py-0.5 rounded text-[#8b8b9a]">
                        Preview
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ROW ── */}
      <section className="border-y border-[#2a2a35] bg-[#16161a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: 12000, suffix: "+", label: "Businesses" },
              { value: 40, suffix: "+", label: "Festivals covered" },
              { value: 30, suffix: "s", label: "To create a post" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </div>
                <p className="text-xs sm:text-sm text-[#8b8b9a]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCROLLING MARQUEE ── */}
      <section className="border-b border-[#2a2a35] bg-[#0d0d0f] overflow-hidden py-5">
        <p className="text-center text-xs text-[#555562] uppercase tracking-widest mb-4">
          Trusted by 12,000+ Indian businesses
        </p>
        <div className="relative flex overflow-hidden">
          {[0, 1].map((copy) => (
            <motion.div
              key={copy}
              className="flex gap-3 flex-shrink-0 pr-3"
              animate={{ x: ["0%", "-100%"] }}
              transition={{ duration: 28, ease: "linear", repeat: Infinity }}
            >
              {businesses.map((biz) => (
                <span
                  key={biz + copy}
                  className="bg-[#16161a] border border-[#2a2a35] text-[#8b8b9a] text-xs sm:text-sm px-3 py-1.5 rounded-full whitespace-nowrap"
                >
                  {biz}
                </span>
              ))}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            From voice to viral in{" "}
            <span className="text-[#25D366]">30 seconds</span>
          </h2>
          <p className="text-[#8b8b9a] text-base max-w-md mx-auto">
            The simplest marketing workflow ever built for Indian businesses.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px bg-gradient-to-r from-[#2a2a35] via-[#25D366]/40 to-[#2a2a35]" />

          <AnimatePresence mode="wait">
            {[
              { icon: "🎙️", step: "01", titleKey: "step1Title" as const, descKey: "step1Desc" as const, color: "#ff6b35" },
              { icon: "✨", step: "02", titleKey: "step2Title" as const, descKey: "step2Desc" as const, color: "#25D366" },
              { icon: "📲", step: "03", titleKey: "step3Title" as const, descKey: "step3Desc" as const, color: "#7c3aed" },
            ].map((s, i) => (
              <motion.div
                key={lang + s.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative bg-[#16161a] border border-[#2a2a35] rounded-2xl p-6 text-center hover:border-[#3a3a45] transition-colors group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 transition-transform group-hover:scale-110"
                  style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}
                >
                  {s.icon}
                </div>
                <span
                  className="inline-block text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full mb-3"
                  style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30` }}
                >
                  STEP {s.step}
                </span>
                <h3 className="text-lg font-bold mb-2">{t[s.titleKey]}</h3>
                <p className="text-[#8b8b9a] text-sm leading-relaxed">{t[s.descKey]}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="bg-[#16161a] border-y border-[#2a2a35]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
              Everything you need to{" "}
              <span className="text-[#25D366]">market on WhatsApp</span>
            </h2>
            <p className="text-[#8b8b9a] text-base max-w-md mx-auto">
              Built specifically for how Indian small businesses actually work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Mic className="w-5 h-5 text-white" />,
                iconBg: "#25D366",
                title: "Voice to Post",
                desc: "Speak in any language. Get posts in 30 seconds. No typing, no designing.",
              },
              {
                icon: <span className="text-xl">🎉</span>,
                iconBg: "#f59e0b",
                title: "Festival Engine",
                desc: "Never miss Diwali, Eid, Pongal, or 40+ festivals. Posts auto-generate 3 days before.",
              },
              {
                icon: <Bot className="w-5 h-5 text-white" />,
                iconBg: "#7c3aed",
                title: "WhatsApp Bot",
                desc: "Your AI marketing manager lives in WhatsApp. Approve, edit, regenerate — all by chat.",
              },
              {
                icon: <ShoppingCart className="w-5 h-5 text-white" />,
                iconBg: "#ff6b35",
                title: "Reply to Buy",
                desc: "Customers reply to your status → bot collects order → Razorpay payment link sent automatically.",
              },
              {
                icon: <Sparkles className="w-5 h-5 text-white" />,
                iconBg: "#0ea5e9",
                title: "Brand Watermark",
                desc: "Your logo, your colours, your CTA baked into every image. statuscraft.in drives new signups.",
              },
              {
                icon: <BarChart2 className="w-5 h-5 text-white" />,
                iconBg: "#ec4899",
                title: "Analytics",
                desc: "Track views, replies, and conversion rate. Know which posts drive orders.",
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-[#0d0d0f] border border-[#2a2a35] rounded-2xl p-5 hover:border-[#3a3a45] transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.iconBg }}
                >
                  {f.icon}
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-[#8b8b9a] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            Simple, honest{" "}
            <span className="text-[#25D366]">pricing</span>
          </h2>
          <p className="text-[#8b8b9a] text-base max-w-md mx-auto">
            Start free. Upgrade only when you&apos;re growing.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 lg:gap-6 items-start">
          {/* Free */}
          <div className="bg-[#16161a] border border-[#2a2a35] rounded-2xl p-6">
            <p className="text-sm font-semibold text-[#8b8b9a] mb-1">Free</p>
            <p className="text-3xl font-extrabold mb-1">₹0</p>
            <p className="text-xs text-[#8b8b9a] mb-6">forever</p>
            <ul className="space-y-3 mb-8 text-sm">
              {["30 posts / month", "1 brand", "Voice to Post", "5 festival posts / month"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[#8b8b9a]">
                  <Check className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
              {["WhatsApp Bot", "Reply to Buy"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[#555562]">
                  <span className="w-4 h-4 flex-shrink-0 text-center leading-none mt-0.5 text-lg">—</span>
                  {f}
                </li>
              ))}
            </ul>
            <AnimatePresence mode="wait">
              <motion.div key={lang + "-free"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link
                  href="/login"
                  className="block text-center border border-[#2a2a35] hover:border-[#3a3a45] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {t.startFree}
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pro */}
          <div className="bg-[#16161a] border-2 border-[#25D366] rounded-2xl p-6 relative shadow-[0_0_40px_rgba(37,211,102,0.12)]">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#25D366] text-black text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Most Popular
            </span>
            <p className="text-sm font-semibold text-[#25D366] mb-1">Pro</p>
            <p className="text-3xl font-extrabold mb-1">₹999</p>
            <p className="text-xs text-[#8b8b9a] mb-6">per month</p>
            <ul className="space-y-3 mb-8 text-sm">
              {["Unlimited posts", "1 brand", "Voice to Post", "Festival Engine (all)", "WhatsApp Bot", "Reply to Buy"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[#8b8b9a]">
                  <Check className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <AnimatePresence mode="wait">
              <motion.div key={lang + "-pro"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link
                  href="/login"
                  className="block text-center bg-[#25D366] hover:bg-[#1aab52] text-black font-bold py-2.5 rounded-xl text-sm transition-all hover:shadow-[0_0_20px_rgba(37,211,102,0.4)]"
                >
                  {t.startPro}
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Agency */}
          <div className="bg-[#16161a] border border-[#2a2a35] rounded-2xl p-6">
            <p className="text-sm font-semibold text-[#8b8b9a] mb-1">Agency</p>
            <p className="text-3xl font-extrabold mb-1">₹2,499</p>
            <p className="text-xs text-[#8b8b9a] mb-6">per month</p>
            <ul className="space-y-3 mb-8 text-sm">
              {["Unlimited posts", "10 brands", "Voice to Post", "Festival Engine (all)", "WhatsApp Bot", "Reply to Buy"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[#8b8b9a]">
                  <Check className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="block text-center border border-[#2a2a35] hover:border-[#3a3a45] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-[#16161a] border-y border-[#2a2a35]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
              Real businesses,{" "}
              <span className="text-[#25D366]">real results</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 lg:gap-6">
            {[
              {
                name: "Priya Sharma",
                biz: "Priya's Kitchen",
                location: "Mumbai",
                quote: "Main bas apni awaaz mein bol deti hoon 'aaj special thali 120 rupaye' — aur 30 second mein 3 posts ready. Mujhe typing bhi nahi karni! Mere customers ko lagta hai mera poora marketing team hai.",
                stars: 5,
              },
              {
                name: "Ramesh Agarwal",
                biz: "Agarwal Sweets",
                location: "Jaipur",
                quote: "Diwali ke liye posts automatically 3 din pehle ban gayi — with our logo, our colours, everything. Maine kuch nahi kiya. 400+ orders came in just from WhatsApp Status that week. Incredible.",
                stars: 5,
              },
              {
                name: "Fatima Malik",
                biz: "Style Studio",
                location: "Hyderabad",
                quote: "A customer replied to my status about a bridal package. The bot collected her details and sent a payment link. By the time I woke up, the booking was confirmed. I didn't even know about it!",
                stars: 5,
              },
            ].map((testimonial) => (
              <motion.div
                key={testimonial.name}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-[#0d0d0f] border border-[#2a2a35] rounded-2xl p-6 flex flex-col hover:border-[#3a3a45] transition-colors"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: testimonial.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#f59e0b] fill-[#f59e0b]" />
                  ))}
                </div>
                <p className="text-[#8b8b9a] text-sm leading-relaxed flex-1 mb-5">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-[#8b8b9a]">
                    {testimonial.biz} · {testimonial.location}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-[#0a1f0f] border-y border-[#1a3a1f] relative overflow-hidden">
        {/* glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(ellipse at 50% 50%, #25D366 0%, transparent 65%)" }}
        />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            Ready to grow on{" "}
            <span className="text-[#25D366]">WhatsApp?</span>
          </h2>
          <p className="text-[#8b8b9a] text-base mb-8">
            Join 12,000+ businesses already using StatusCraft
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:shadow-[0_0_40px_rgba(37,211,102,0.5)]"
          >
            Start free — no credit card needed <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#2a2a35]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-4 gap-8 mb-10">
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-black fill-black" />
                </div>
                <span className="font-bold">StatusCraft</span>
              </div>
              <p className="text-xs text-[#8b8b9a] leading-relaxed">
                AI marketing for Indian businesses
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Product</p>
              <ul className="space-y-2">
                {[
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "How it works", href: "#how-it-works" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-[#8b8b9a] hover:text-white transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Company</p>
              <ul className="space-y-2">
                {[
                  { label: "About", href: "#" },
                  { label: "Contact", href: "#" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-[#8b8b9a] hover:text-white transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Legal</p>
              <ul className="space-y-2">
                {[
                  { label: "Privacy", href: "#" },
                  { label: "Terms", href: "#" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-[#8b8b9a] hover:text-white transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#2a2a35] pt-6 text-center">
            <p className="text-xs text-[#555562]">
              © 2025 StatusCraft. Made with ❤️ in India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
