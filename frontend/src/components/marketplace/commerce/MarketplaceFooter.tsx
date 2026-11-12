import React, { useState } from 'react';
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Building2,
  ExternalLink,
  CheckCircle2,
  Scale,
  Truck,
  PhoneCall,
  HelpCircle,
  X,
  FileCheck2,
  Lock,
  Banknote,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMarketplaceLang } from './useMarketplaceLang';

type FooterModalKey =
  | 'dbid'
  | 'help'
  | 'howToBuy'
  | 'returns'
  | 'contact'
  | 'about'
  | 'escrow'
  | 'university'
  | 'conduct'
  | 'affiliate'
  | null;

const SEO_DIRECTORY_GROUPS = [
  {
    titleEn: 'Top Smartphone Brands',
    titleBn: 'সেরা স্মার্টফোন ব্র্যান্ড',
    categorySlug: 'electronic-devices',
    links: [
      { nameEn: 'Xiaomi Phones', nameBn: 'শাওমি মোবাইল ফোন', q: 'xiaomi' },
      { nameEn: 'Samsung Smartphones', nameBn: 'স্যামসাং গ্যালাক্সি', q: 'samsung' },
      { nameEn: 'Walton Primo Mobile', nameBn: 'ওয়ালটন প্রিমো স্মার্টফোন', q: 'walton' },
      { nameEn: 'Realme Phones', nameBn: 'রিয়েলমি মোবাইল', q: 'realme' },
      { nameEn: 'Apple iPhones', nameBn: 'অ্যাপল আইফোন', q: 'iphone' },
      { nameEn: 'Vivo Smart Devices', nameBn: 'ভিভো স্মার্টফোন', q: 'vivo' },
      { nameEn: 'Infinix Mobiles', nameBn: 'ইনফিনিক্স স্মার্টফোন', q: 'infinix' },
      { nameEn: 'Tecno Smartphones', nameBn: 'টেকনো স্মার্টফোন', q: 'tecno' },
    ],
  },
  {
    titleEn: 'Popular Consumer Electronics',
    titleBn: 'জনপ্রিয় ইলেকট্রনিক্স ও গ্যাজেটস',
    categorySlug: 'electronic-devices',
    links: [
      { nameEn: '4K Smart LED TVs', nameBn: 'স্মার্ট ফোর-কে এলইডি টিভি', q: 'smart tv' },
      { nameEn: 'Inverter Air Conditioners', nameBn: 'ইনভার্টার এয়ার কন্ডিশনার', q: 'ac' },
      { nameEn: 'Walton Refrigerators', nameBn: 'ওয়ালটন নন-ফ্রস্ট ফ্রিজ', q: 'refrigerator' },
      { nameEn: 'Laptops & MacBooks', nameBn: 'ল্যাপটপ ও আল্ট্রাবুক', q: 'laptop' },
      { nameEn: 'TWS Wireless Earbuds', nameBn: 'টিডব্লিউএস ব্লুটুথ এয়ারবাডস', q: 'earbuds' },
      { nameEn: 'Fast Charging Power Banks', nameBn: 'ফাস্ট চার্জিং পাওয়ার ব্যাংক', q: 'power bank' },
      { nameEn: 'Smart Fitness Watches', nameBn: 'স্মার্ট ফিটনেস ওয়াচ', q: 'smart watch' },
      { nameEn: 'Microwave Ovens', nameBn: 'মাইক্রোওয়েভ ওভেন', q: 'oven' },
    ],
  },
  {
    titleEn: 'Traditional & Lifestyle Fashion',
    titleBn: 'ঐতিহ্যবাহী পোশাক ও লাইফস্টাইল',
    categorySlug: 'clothing',
    links: [
      { nameEn: 'Tangail Jamdani Sarees', nameBn: 'টাঙ্গাইল জামদানি শাড়ি', q: 'jamdani' },
      { nameEn: 'Mirpur Katan Sarees', nameBn: 'মিরপুর কাতান শাড়ি', q: 'katan' },
      { nameEn: 'Salwar Kameez & 3-Piece', nameBn: 'সালোয়ার কামিজ ও থ্রি-পিস', q: 'salwar kameez' },
      { nameEn: 'Exclusive Kurtis & Tunics', nameBn: 'এক্সক্লুসিভ কুর্তি ও টিউনিক', q: 'kurti' },
      { nameEn: "Men's Premium Panjabi", nameBn: 'পুরুষদের প্রিমিয়াম পাঞ্জাবি', q: 'panjabi' },
      { nameEn: 'Formal & Casual Shirts', nameBn: 'ফরমাল ও ক্যাজুয়াল শার্ট', q: 'shirt' },
      { nameEn: 'Apex Leather Shoes', nameBn: 'অ্যাপেক্স লেদার জুতো', q: 'apex' },
      { nameEn: 'Bata Comfort Footwear', nameBn: 'বাটা কমফোর্ট জুতো', q: 'bata' },
    ],
  },
  {
    titleEn: 'Daily Groceries & Essentials',
    titleBn: 'দৈনন্দিন মুদি ও গ্রোসারি পণ্য',
    categorySlug: 'groceries',
    links: [
      { nameEn: 'Chinigura & Basmati Rice', nameBn: 'চিনিগুঁড়া ও বাসমতি চাল', q: 'rice' },
      { nameEn: 'Pure Mustard & Soybean Oil', nameBn: 'সরিষা ও সয়াবিন তেল', q: 'oil' },
      { nameEn: 'Pure Organic Ghee', nameBn: 'খাঁটি গাওয়া ঘি', q: 'ghee' },
      { nameEn: 'Dry Fruits, Honey & Nuts', nameBn: 'কাজুবাদাম, কাঠবাদাম ও সুন্দরবনের মধু', q: 'nuts' },
      { nameEn: 'Baby Diapers & Wet Wipes', nameBn: 'বেবি ডায়াপার ও ওয়েট ওয়াইপস', q: 'diapers' },
      { nameEn: 'Shampoo & Hair Care', nameBn: 'শ্যাম্পু ও হেয়ার অয়েল', q: 'shampoo' },
      { nameEn: 'Bathing Soaps & Body Wash', nameBn: 'সাবান ও বডি ওয়াশ', q: 'soap' },
      { nameEn: 'Laundry Detergent Powder', nameBn: 'ডিটারজেন্ট পাউডার', q: 'detergent' },
    ],
  },
  {
    titleEn: 'Mega Campaigns & Shopping Fairs',
    titleBn: 'মেগা ক্যাম্পেইন ও উৎসব অফার',
    categorySlug: 'flash-sale',
    links: [
      { nameEn: '11.11 Biggest Sale of the Year', nameBn: '১১.১১ বছরের সবচেয়ে বড় সেল', q: '11.11' },
      { nameEn: '12.12 Year-End Clearance', nameBn: '১২.১২ ইয়ার-এন্ড মেগা সেল', q: '12.12' },
      { nameEn: 'Eid Shopping Carnival', nameBn: 'ঈদ শপিং কার্নিভাল', q: 'eid' },
      { nameEn: 'Pohela Boishakh Fair', nameBn: 'পহেলা বৈশাখ মেলা অফার', q: 'boishakh' },
      { nameEn: '6-Hour Flash Sale Slots', nameBn: '৬-ঘণ্টার ফ্ল্যাশ ডিল স্লট', q: 'flash' },
      { nameEn: '100% Authentic Mall Brands', nameBn: '১০০% আসল মল ব্র্যান্ড', q: 'mall' },
      { nameEn: 'Zero Percent (0%) EMI Stores', nameBn: '০% কিস্তির অফিসিয়াল শপ', q: 'emi' },
      { nameEn: 'Free Delivery Special Deals', nameBn: 'ফ্রি ডেলিভারি স্পেশাল পণ্য', q: 'free delivery' },
    ],
  },
];

const MarketplaceFooter: React.FC = () => {
  const { t, formatNum } = useMarketplaceLang();
  const [activeModal, setActiveModal] = useState<FooterModalKey>(null);
  const [seoDirectoryOpen, setSeoDirectoryOpen] = useState(true);

  const renderModalContent = () => {
    if (!activeModal) return null;

    const modalConfigs: Record<
      Exclude<FooterModalKey, null>,
      { title: string; badge: string; body: React.ReactNode }
    > = {
      dbid: {
        title: t(
          'DBID — Digital Business Identification Certificate',
          'ডিবিআইডি (DBID) — ডিজিটাল বিজনেস আইডেন্টিফিকেশন সনদ',
        ),
        badge: t('Ministry of Commerce, Bangladesh', 'বাণিজ্য মন্ত্রণালয়, গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'),
        body: (
          <div className="space-y-4 text-xs sm:text-sm text-muted-foreground">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  {t('DBID Registration No:', 'ডিবিআইডি নিবন্ধন নম্বর:')}
                </span>
                <span className="font-mono font-black text-emerald-500 text-base">
                  {t('308924110', '৩০৮৯২৪১১০')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{t('Entity Name:', 'প্রতিষ্ঠানের নাম:')}</span>
                <span className="text-foreground font-bold">Wevsoft WevMall Bangladesh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{t('Compliance Status:', 'কমপ্লায়েন্স স্ট্যাটাস:')}</span>
                <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                  <CheckCircle2 size={14} /> {t('Active & Verified', 'সক্রিয় ও যাচাইকৃত')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{t('Regulatory Framework:', 'নীতিমালা:')}</span>
                <span>
                  {t(
                    'Digital Commerce Operation Guidelines',
                    'ডিজিটাল কমার্স পরিচালনা নির্দেশিকা',
                  )}
                </span>
              </div>
            </div>
            <p>
              {t(
                'WevMall operates in full compliance with the Ministry of Commerce Digital Commerce Operation Guidelines and National Consumer Rights Protection Directorate (DNCRP) regulations. All digital prepayments are protected under automated escrow rules until delivery confirmation.',
                'উইভমল গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের বাণিজ্য মন্ত্রণালয়ের ডিজিটাল কমার্স পরিচালনা নির্দেশিকা এবং জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তরের (DNCRP) নিয়মাবলী সম্পূর্ণ অনুসরণ করে পরিচালিত। ক্রেতার প্রতিটি ডিজিটাল পেমেন্ট ডেলিভারি নিশ্চিত না হওয়া পর্যন্ত এসক্রো সুরক্ষায় সংরক্ষিত থাকে।',
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="https://ccms.gov.bd/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
              >
                {t('Open Government CCMS Portal', 'সরকারি CCMS পোর্টালে যান')}
                <ExternalLink size={13} />
              </a>
              <span className="text-xs text-muted-foreground">
                {t('DNCRP Consumer Helpline: 16121', 'জাতীয় ভোক্তা অধিকার হেল্পলাইন: ১৬১২১')}
              </span>
            </div>
          </div>
        ),
      },
      help: {
        title: t('WevMall Help Center', 'উইভমল হেল্প সেন্টার'),
        badge: t('24/7 Buyer Protection', '২৪/৭ ক্রেতা সহায়তা'),
        body: (
          <div className="space-y-3 text-xs sm:text-sm text-muted-foreground">
            <p>
              {t(
                'Need assistance with an order, delivery timeline, or refund request? Use our instant self-service tools or reach out to customer care.',
                'অর্ডার ট্র্যাকিং, ডেলিভারি সময়সীমা বা রিফান্ড সংক্রান্ত যেকোনো সহায়তার জন্য আমাদের সেলফ-সার্ভিস টুল বা কাস্টমার কেয়ারে যোগাযোগ করুন।',
              )}
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground">
              <li>
                {t(
                  'Inside Dhaka Delivery: 2–3 Business Days',
                  'ঢাকা সিটির ভেতরে ডেলিভারি: ২–৩ কার্যদিবস',
                )}
              </li>
              <li>
                {t(
                  'Outside Dhaka (All 64 Districts): 4–7 Business Days',
                  'ঢাকার বাইরে (৬৪ জেলা): ৪–৭ কার্যদিবস',
                )}
              </li>
              <li>
                {t(
                  'Easy Return Window: 7 Days (14 Days for Official Flagship Stores)',
                  'সহজ রিটার্ন সুবিধা: ৭ দিন (অফিসিয়াল ফ্ল্যাগশিপ স্টোরে ১৪ দিন)',
                )}
              </li>
            </ul>
          </div>
        ),
      },
      howToBuy: {
        title: t('How to Buy on WevMall', 'উইভমলে কীভাবে অর্ডার করবেন'),
        badge: t('Step-by-Step Guide', 'ধাপে ধাপে নির্দেশিকা'),
        body: (
          <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">{t('Search & Select:', 'পণ্য খুঁজুন ও নির্বাচন করুন:')}</strong>{' '}
              {t(
                'Browse categories or use text, voice, or image search to find your desired item.',
                'ক্যাটাগরি ব্রাউজ করুন অথবা টেক্সট, ভয়েস বা ছবি দিয়ে আপনার পছন্দের পণ্য খুঁজুন।',
              )}
            </li>
            <li>
              <strong className="text-foreground">{t('Add to Cart or Buy Now:', 'কার্টে যোগ করুন বা কিনুন:')}</strong>{' '}
              {t(
                'Open the product details page, choose your preferred variant/size, and click Buy Now.',
                'পণ্যের বিস্তারিত পেজে গিয়ে সাইজ বা কালার সিলেক্ট করে Add to Cart বা Buy Now চাপুন।',
              )}
            </li>
            <li>
              <strong className="text-foreground">{t('Choose Payment Method:', 'পেমেন্ট মাধ্যম বেছে নিন:')}</strong>{' '}
              {t(
                'Pay securely via bKash, Nagad, VISA/MasterCard, or select Cash on Delivery (COD).',
                'বিকাশ, নগদ, ভিসা/মাস্টারকার্ড অথবা ক্যাশ অন ডেলিভারি (পণ্য হাতে পেয়ে মূল্য পরিশোধ) সিলেক্ট করুন।',
              )}
            </li>
          </ol>
        ),
      },
      returns: {
        title: t('Returns & Refunds Policy', 'রিটার্ন ও রিফান্ড নীতিমালা'),
        badge: t('100% Buyer Protection', '১০০% ক্রেতা সুরক্ষা'),
        body: (
          <div className="space-y-3 text-xs sm:text-sm text-muted-foreground">
            <p>
              {t(
                'If your product is damaged, defective, incorrect, or incomplete at the time of delivery, you can initiate a free return request within 7 days (14 days for Official Stores).',
                'ডেলিভারির সময় পণ্য ক্ষতিগ্রস্ত, ত্রুটিপূর্ণ, ভুল বা অসম্পূর্ণ হলে ডেলিভারির ৭ দিনের মধ্যে (অফিসিয়াল স্টোরের ক্ষেত্রে ১৪ দিন) বিনামূল্যে রিটার্ন রিকোয়েস্ট করতে পারবেন।',
              )}
            </p>
            <p className="text-foreground font-semibold">
              {t(
                'Refund Timeline: bKash/Nagad refunds are processed within 2–3 working days; Card refunds within 5–7 working days.',
                'রিফান্ড সময়সীমা: বিকাশ/নগদ রিফান্ড ২–৩ কার্যদিবসে এবং ব্যাংক কার্ড রিফান্ড ৫–৭ কার্যদিবসের মধ্যে সম্পন্ন হয়।',
              )}
            </p>
          </div>
        ),
      },
      contact: {
        title: t('Contact Customer Care', 'কাস্টমার কেয়ারে যোগাযোগ'),
        badge: t('Support Channels', 'সহায়তা মাধ্যম'),
        body: (
          <div className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
            <p className="text-foreground font-bold">
              {t('Hotline: +880 9610-000000 (9:00 AM – 11:00 PM)', 'হটলাইন: +৮৮০ ৯৬১০-০০০০০০ (সকাল ৯টা – রাত ১১টা)')}
            </p>
            <p>{t('Support Email: support@wevsoft.com', 'সাপোর্ট ইমেইল: support@wevsoft.com')}</p>
            <p>
              {t(
                'Government CCMS Escalation: https://ccms.gov.bd (DNCRP Helpline: 16121)',
                'সরকারি ভোক্তা অভিযোগ পোর্টাল (CCMS): https://ccms.gov.bd (হেল্পলাইন: ১৬১২১)',
              )}
            </p>
          </div>
        ),
      },
      about: {
        title: t('About Wevsoft WevMall', 'উইভসফট উইভমল সম্পর্কে'),
        badge: t('Trusted BD Marketplace', 'বিশ্বস্ত ই-কমার্স মার্কেটপ্লেস'),
        body: (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t(
              'WevMall is Wevsoft’s integrated social commerce marketplace connecting verified Bangladeshi brands, local SMEs, and millions of shoppers across all 64 districts with AI-powered discovery, live shopping, and escrow-protected digital payments.',
              'উইভমল হলো উইভসফট-এর আধুনিক সোশ্যাল ই-কমার্স মার্কেটপ্লেস যা বাংলাদেশের ৬৪ জেলায় ভেরিফায়েড ব্র্যান্ড, দেশীয় উদ্যোক্তা এবং ক্রেতাদের এআই সার্চ, লাইভ শপিং এবং নিরাপদ ডিজিটাল পেমেন্টের মাধ্যমে সংযুক্ত করে।',
            )}
          </p>
        ),
      },
      escrow: {
        title: t('Digital Payments & Escrow Security', 'ডিজিটাল পেমেন্ট ও এসক্রো সুরক্ষা'),
        badge: t('PCI-DSS & SSL Verified', 'পিসিআই-ডিএসএস ও এসএসএল সুরক্ষিত'),
        body: (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t(
              'Every online payment made via bKash, Nagad, VISA, MasterCard, or AMEX is held securely in escrow and only released to the merchant after your order is delivered and the return inspection window is satisfied.',
              'বিকাশ, নগদ, ভিসা বা মাস্টারকার্ডের মাধ্যমে পরিশোধিত প্রতিটি পেমেন্ট নিরাপদ এসক্রোতে সংরক্ষিত থাকে এবং ক্রেতার কাছে সফলভাবে পণ্য ডেলিভারির পরই কেবল বিক্রেতার অ্যাকাউন্টে ছাড় করা হয়।',
            )}
          </p>
        ),
      },
      university: {
        title: t('WevMall Seller University', 'উইভমল সেলার ইউনিভার্সিটি'),
        badge: t('Free Merchant Training', 'বিনামূল্যে বিক্রেতা প্রশিক্ষণ'),
        body: (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t(
              'Learn how to photograph products, optimize Bengali & English titles, join Flash Sale slots, and scale your online store across Bangladesh with zero upfront registration fees.',
              'কীভাবে পণ্যের আকর্ষণীয় ছবি তুলবেন, ফ্ল্যাশ সেল ক্যাম্পেইনে যুক্ত হবেন এবং সারা বাংলাদেশে আপনার অনলাইন ব্যবসা প্রসারিত করবেন তা শিখুন সম্পূর্ণ বিনামূল্যে।',
            )}
          </p>
        ),
      },
      conduct: {
        title: t('Marketplace Code of Conduct', 'মার্কেটপ্লেস আচরণবিধি'),
        badge: t('Zero Counterfeit Policy', '১০০% আসল পণ্যের অঙ্গীকার'),
        body: (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t(
              'WevMall enforces a strict zero-tolerance policy against counterfeit goods, misleading pricing, and prohibited items. Sellers must maintain accurate stock counts and honor all warranty commitments.',
              'নকল পণ্য, বিভ্রান্তিকর মূল্য বা নিষিদ্ধ পণ্যের বিরুদ্ধে উইভমল কঠোর জিরো-টলারেন্স নীতি অনুসরণ করে। প্রতিটি বিক্রেতাকে সঠিক স্টক এবং ওয়ারেন্টি প্রতিশ্রুতি বজায় রাখতে হয়।',
            )}
          </p>
        ),
      },
      affiliate: {
        title: t('WevMall Affiliate Program', 'উইভমল অ্যাফিলিয়েট প্রোগ্রাম'),
        badge: t('Earn Up to 12% Commission', '১২% পর্যন্ত কমিশন আয় করুন'),
        body: (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t(
              'Share WevMall product links on your social feed, Reels, or creator channel and earn automatic commission payouts on every verified purchase.',
              'আপনার সোশ্যাল ফিড, রিলস বা ক্রিয়েটর চ্যানেলে উইভমলের পণ্যের লিঙ্ক শেয়ার করুন এবং প্রতিটি সফল অর্ডারে আকর্ষণীয় কমিশন আয় করুন।',
            )}
          </p>
        ),
      },
    };

    const current = modalConfigs[activeModal];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card text-foreground shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border bg-muted/40">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold mb-1.5">
                <ShieldCheck size={12} /> {current.badge}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-foreground">{current.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4 sm:p-5">{current.body}</div>
          <div className="px-4 sm:px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              {t('Close', 'বন্ধ করুন')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <footer className="bg-card border-t border-border mt-12 text-sm rounded-t-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* Top 4-Column Directory (Daraz BD Parity) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Column 1: Customer Care + CCMS */}
          <div>
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-1.5">
              <HelpCircle size={15} className="text-primary" />
              {t('Customer Care', 'গ্রাহক সেবা (Customer Care)')}
            </h3>
            <ul className="space-y-2.5 text-muted-foreground text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('help')}
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('Help Center', 'হেল্প সেন্টার')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('howToBuy')}
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('How to Buy', 'কীভাবে কিনবেন')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('returns')}
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('Returns & Refunds', 'রিটার্ন ও রিফান্ড পলিসি')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('contact')}
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('Contact Us', 'যোগাযোগ করুন')}
                </button>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  {t('Terms & Conditions', 'শর্তাবলী (Terms & Conditions)')}
                </Link>
              </li>
              <li className="pt-1">
                <a
                  href="https://ccms.gov.bd/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-500 hover:text-emerald-400 font-semibold transition-colors"
                >
                  <Scale size={14} className="shrink-0" />
                  <span>
                    {t(
                      'CCMS - Central Complain Management System',
                      'কেন্দ্রীয় অভিযোগ ব্যবস্থাপনা সিস্টেম (CCMS)',
                    )}
                  </span>
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Wevsoft WevMall Corporate */}
          <div>
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-1.5">
              <Building2 size={15} className="text-primary" />
              {t('Wevsoft WevMall', 'উইভসফট উইভমল')}
            </h3>
            <ul className="space-y-2.5 text-muted-foreground text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('about')}
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('About WevMall', 'উইভমল সম্পর্কে')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('escrow')}
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('Digital Payments & Escrow', 'ডিজিটাল পেমেন্ট ও এসক্রো')}
                </button>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  {t('Privacy Policy', 'গোপনীয়তা নীতি (Privacy Policy)')}
                </Link>
              </li>
              <li>
                <Link to="/wevmall/orders" className="hover:text-primary transition-colors">
                  {t('Track My Order', 'অর্ডার ট্র্যাক করুন')}
                </Link>
              </li>
              <li>
                <Link to="/wevmall/sellers" className="hover:text-primary transition-colors">
                  {t('WevMall Official Stores', 'উইভমল ভেরিফায়েড স্টোরসমূহ')}
                </Link>
              </li>
              <li>
                <Link to="/wevmall/live" className="hover:text-primary transition-colors">
                  {t('WevMall Live Shopping', 'উইভমল লাইভ শপিং')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Earn With Us */}
          <div>
            <h3 className="font-bold text-foreground mb-4">
              {t('Earn With Us', 'আমাদের সাথে আয় করুন')}
            </h3>
            <ul className="space-y-2.5 text-muted-foreground text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('university')}
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('WevMall University', 'উইভমল সেলার ইউনিভার্সিটি')}
                </button>
              </li>
              <li>
                <Link
                  to="/seller/onboarding"
                  className="hover:text-primary transition-colors text-primary font-bold"
                >
                  {t('Sell on WevMall (Verified Seller)', 'উইভমলে বিক্রি করুন (ভেরিফায়েড সেলার)')}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('conduct')}
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('Code of Conduct', 'বিক্রেতা আচরণবিধি')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('affiliate')}
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('Join the WevMall Affiliate Program', 'উইভমল অ্যাফিলিয়েট প্রোগ্রামে যোগ দিন')}
                </button>
              </li>
            </ul>

            {/* Consumer Helpline Pill */}
            <div className="mt-5 p-3 rounded-xl border border-border bg-background/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <PhoneCall size={15} />
              </div>
              <div className="text-xs">
                <div className="font-bold text-foreground">
                  {t('Consumer Rights Helpline', 'জাতীয় ভোক্তা অধিকার হেল্পলাইন')}
                </div>
                <div className="text-muted-foreground font-mono">
                  {t('DNCRP: 16121 • 24/7 Support', 'হটলাইন: ১৬১২১ • সার্বক্ষণিক সহায়তা')}
                </div>
              </div>
            </div>
          </div>

          {/* Column 4: Official DBID Registration Card & App Download */}
          <div>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-1.5">
              <FileCheck2 size={15} className="text-emerald-500" />
              {t('DBID & Regulatory Verification', 'ডিবিআইডি (DBID) ও সরকারি নিবন্ধন')}
            </h3>

            {/* Mandatory Bangladesh Ministry of Commerce DBID Badge */}
            <div className="p-3.5 rounded-xl border border-emerald-500/35 bg-emerald-500/5 mb-5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  {t('Verified DBID Entity', 'ভেরিফায়েড ডিবিআইডি সনদ')}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-mono text-[11px] font-bold">
                  DBID: {formatNum(308924110)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mb-2.5">
                {t(
                  'Registered with the Ministry of Commerce, Govt. of the People’s Republic of Bangladesh.',
                  'বাণিজ্য মন্ত্রণালয়, গণপ্রজাতন্ত্রী বাংলাদেশ সরকার কর্তৃক নিবন্ধিত ই-কমার্স প্রতিষ্ঠান।',
                )}
              </p>
              <button
                type="button"
                onClick={() => setActiveModal('dbid')}
                className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={14} />
                {t('Verify DBID & CCMS License', 'ডিবিআইডি ও সিসিএমএস সনদ দেখুন')}
              </button>
            </div>

            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-2.5">
              {t('Download Wevsoft App', 'উইভসফট অ্যাপ ডাউনলোড করুন')}
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveModal('about')}
                className="bg-background border border-border p-2 rounded-lg flex items-center justify-center gap-2 hover:border-primary transition-colors text-left"
              >
                <Smartphone className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <div className="text-[9px] text-muted-foreground leading-none">
                    {t('Download on', 'ডাউনলোড করুন')}
                  </div>
                  <div className="text-xs font-bold text-foreground leading-tight">App Store</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('about')}
                className="bg-background border border-border p-2 rounded-lg flex items-center justify-center gap-2 hover:border-primary transition-colors text-left"
              >
                <Smartphone className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <div className="text-[9px] text-muted-foreground leading-none">
                    {t('Get it on', 'ডাউনলোড করুন')}
                  </div>
                  <div className="text-xs font-bold text-foreground leading-tight">Google Play</div>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {t('Follow Us:', 'সোশ্যাল মিডিয়া:')}
              </span>
              <div className="flex gap-3 text-muted-foreground">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="hover:text-primary transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="hover:text-primary transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="hover:text-primary transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="hover:text-primary transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Tier: Payment Methods, Verified By & Nationwide Logistics Partners */}
        <div className="py-6 border-t border-border grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Methods */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <CreditCard size={14} className="text-primary" />
              {t('Payment Methods', 'পেমেন্ট মাধ্যমসমূহ')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="bg-background border border-pink-500/30 px-2.5 py-1 rounded-md text-xs font-extrabold text-pink-500">
                bKash {t('', '(বিকাশ)')}
              </span>
              <span className="bg-background border border-orange-500/30 px-2.5 py-1 rounded-md text-xs font-extrabold text-orange-500">
                Nagad {t('', '(নগদ)')}
              </span>
              <span className="bg-background border border-purple-500/30 px-2.5 py-1 rounded-md text-xs font-extrabold text-purple-400">
                Rocket {t('', '(রকেট)')}
              </span>
              <span className="bg-background border border-blue-500/30 px-2.5 py-1 rounded-md text-xs font-extrabold text-blue-500">
                VISA
              </span>
              <span className="bg-background border border-red-500/30 px-2.5 py-1 rounded-md text-xs font-extrabold text-red-500">
                MasterCard
              </span>
              <span className="bg-background border border-sky-500/30 px-2.5 py-1 rounded-md text-xs font-extrabold text-sky-400">
                AMEX
              </span>
              <span className="bg-background border border-indigo-500/30 px-2.5 py-1 rounded-md text-xs font-extrabold text-indigo-400">
                DBBL Nexus
              </span>
              <span className="bg-background border border-emerald-500/30 px-2.5 py-1 rounded-md text-xs font-bold text-emerald-500 flex items-center gap-1">
                <Banknote size={12} /> {t('Cash on Delivery', 'ক্যাশ অন ডেলিভারি')}
              </span>
              <span className="bg-background border border-amber-500/30 px-2.5 py-1 rounded-md text-xs font-bold text-amber-500">
                {t('0% EMI (15+ Banks)', '০% ইএমআই কিস্তি সুবিধা')}
              </span>
            </div>
          </div>

          {/* Verified By & Security Standards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Lock size={14} className="text-emerald-500" />
              {t('Verified By & Security', 'ভেরিফায়েড ও নিরাপত্তা মানদণ্ড')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveModal('dbid')}
                className="bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md text-xs font-bold text-emerald-500 flex items-center gap-1 hover:bg-emerald-500/20 transition-colors"
              >
                <ShieldCheck size={13} /> DBID #{formatNum(308924110)}
              </button>
              <a
                href="https://ccms.gov.bd/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-md text-xs font-bold text-primary flex items-center gap-1 hover:bg-primary/20 transition-colors"
              >
                <Scale size={12} /> CCMS (ccms.gov.bd)
              </a>
              <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground">
                PCI-DSS Certified
              </span>
              <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground">
                Verified by VISA
              </span>
              <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground">
                MasterCard ID Check
              </span>
            </div>
          </div>

          {/* Nationwide Delivery & Courier Partners */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Truck size={14} className="text-primary" />
              {t('Delivery Partners (All 64 Districts)', 'ডেলিভারি নেটওয়ার্ক (৬৪ জেলা কভারেজ)')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-bold text-primary">
                WevExpress
              </span>
              <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground">
                RedX
              </span>
              <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground">
                Steadfast
              </span>
              <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground">
                Pathao Courier
              </span>
              <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground">
                Paperfly
              </span>
              <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground">
                eCourier
              </span>
            </div>
          </div>
        </div>

        {/* Mega SEO Category & Brand Directory (Daraz Bangladesh Parity) */}
        <div className="py-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setSeoDirectoryOpen((prev) => !prev)}
              className="flex items-center gap-2 group text-left"
            >
              <Sparkles size={15} className="text-primary group-hover:scale-110 transition-transform" />
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                {t('Top Categories & Brand Directory', 'জনপ্রিয় ক্যাটাগরি ও ব্র্যান্ড ডিরেক্টরি')}
              </h4>
              {seoDirectoryOpen ? (
                <ChevronUp size={15} className="text-muted-foreground group-hover:text-foreground" />
              ) : (
                <ChevronDown size={15} className="text-muted-foreground group-hover:text-foreground" />
              )}
            </button>
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              {t(
                'Browse 100% genuine products across Bangladesh with Escrow protection',
                'সারাদেশে এসক্রো সুরক্ষায় ১০০% আসল পণ্য ব্রাউজ করুন',
              )}
            </span>
          </div>

          {seoDirectoryOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 pt-2 animate-in fade-in duration-200">
              {SEO_DIRECTORY_GROUPS.map((group, gIdx) => (
                <div key={gIdx} className="space-y-2.5">
                  <h5 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-border/60 pb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t(group.titleEn, group.titleBn)}
                  </h5>
                  <ul className="space-y-1.5">
                    {group.links.map((link, lIdx) => (
                      <li key={lIdx}>
                        <Link
                          to={`/wevmall?category=${encodeURIComponent(group.categorySlug)}&q=${encodeURIComponent(link.q)}`}
                          className="text-[11px] text-muted-foreground hover:text-primary hover:underline transition-colors block truncate"
                        >
                          {t(link.nameEn, link.nameBn)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Copyright & Legal Attribution */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <div>
            &copy; {formatNum(new Date().getFullYear())}{' '}
            {t(
              'Wevsoft WevMall Bangladesh. All Rights Reserved. | DBID Reg. No: 308924110',
              'উইভসফট উইভমল বাংলাদেশ। সর্বস্বত্ব সংরক্ষিত। | ডিবিআইডি নিবন্ধন নং: ৩০৮৯২৪১১০',
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              {t('Privacy Policy', 'গোপনীয়তা নীতি')}
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              {t('Terms of Service', 'ব্যবহারের শর্তাবলী')}
            </Link>
            <a
              href="https://ccms.gov.bd/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              {t('CCMS Portal', 'সিসিএমএস পোর্টাল')} <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      {renderModalContent()}
    </footer>
  );
};

export default MarketplaceFooter;
