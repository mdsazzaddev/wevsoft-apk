import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shirt,
  Smartphone,
  Tv,
  Headphones,
  Sparkles,
  Baby,
  ShoppingBasket,
  Sofa,
  Trophy,
  Bike,
  BookOpen,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  Flame,
  LayoutGrid,
} from 'lucide-react';
import { useMarketplaceLang } from './useMarketplaceLang';

export interface MegaCategoryItem {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  icon: any;
  featuredBanner?: {
    titleEn: string;
    titleBn: string;
    tagEn: string;
    tagBn: string;
    link: string;
  };
  subgroups: {
    groupTitleEn: string;
    groupTitleBn: string;
    items: {
      nameEn: string;
      nameBn: string;
      slug: string;
      isHot?: boolean;
    }[];
  }[];
}

export const MEGA_DEPARTMENTS: MegaCategoryItem[] = [
  {
    id: 'womens-fashion',
    nameEn: "Women's Fashion",
    nameBn: 'মহিলাদের ফ্যাশন',
    slug: 'clothing',
    icon: Shirt,
    featuredBanner: {
      titleEn: 'Festive Sarees & Kurtis',
      titleBn: 'উৎসবের শাড়ি ও কুর্তি কালেকশন',
      tagEn: 'Up to 50% Off',
      tagBn: '৫০% পর্যন্ত ছাড়',
      link: '/wevmall?category=clothing',
    },
    subgroups: [
      {
        groupTitleEn: 'Traditional Wear',
        groupTitleBn: 'ঐতিহ্যবাহী পোশাক',
        items: [
          { nameEn: 'Sarees (শাড়ি)', nameBn: 'শাড়ি (জামদানি, কাতান, সিল্ক)', slug: 'sarees', isHot: true },
          { nameEn: 'Salwar Kameez', nameBn: 'সালোয়ার কামিজ ও থ্রি-পিস', slug: 'salwar-kameez', isHot: true },
          { nameEn: 'Kurtis & Tunics', nameBn: 'কুর্তি ও টিউনিক', slug: 'kurtis' },
          { nameEn: 'Unstitched Fabric', nameBn: 'আনস্টিচড ফেব্রিক ও গজ কাপড়', slug: 'unstitched-fabric' },
          { nameEn: 'Dupattas & Shawls', nameBn: 'দোপাট্টা ও চাদর', slug: 'dupattas' },
        ],
      },
      {
        groupTitleEn: 'Western & Daily Wear',
        groupTitleBn: 'ওয়েস্টার্ন ও ক্যাজুয়াল',
        items: [
          { nameEn: 'Tops & T-Shirts', nameBn: 'টপস ও টি-শার্ট', slug: 'womens-tops' },
          { nameEn: 'Jeans & Jeggings', nameBn: 'জিন্স ও জেগিংস', slug: 'womens-jeans' },
          { nameEn: 'Palazzos & Pants', nameBn: 'প্লাজো ও ট্রাউজার', slug: 'palazzos' },
          { nameEn: 'Abayas & Hijabs', nameBn: 'বোরকা ও হিজাব কালেকশন', slug: 'abayas', isHot: true },
        ],
      },
      {
        groupTitleEn: 'Bags, Shoes & Jewellery',
        groupTitleBn: 'ব্যাগ, জুতো ও গয়না',
        items: [
          { nameEn: 'Handbags & Purses', nameBn: 'হ্যান্ডব্যাগ ও পার্স', slug: 'handbags' },
          { nameEn: 'Flats & Sandals', nameBn: 'ফ্ল্যাট জুতো ও স্যান্ডেল', slug: 'womens-sandals' },
          { nameEn: 'Fashion Jewellery', nameBn: 'ফ্যাশন জুয়েলারি ও গয়না', slug: 'jewellery', isHot: true },
        ],
      },
    ],
  },
  {
    id: 'mens-fashion',
    nameEn: "Men's Fashion",
    nameBn: 'পুরুষদের ফ্যাশন',
    slug: 'fashion',
    icon: Shirt,
    featuredBanner: {
      titleEn: 'Premium Panjabi & Suits',
      titleBn: 'প্রিমিয়াম পাঞ্জাবি ও ফরমাল কালেকশন',
      tagEn: 'Top Brands',
      tagBn: 'সেরা ব্র্যান্ড',
      link: '/wevmall?category=fashion',
    },
    subgroups: [
      {
        groupTitleEn: 'Traditional Attire',
        groupTitleBn: 'ঐতিহ্যবাহী পোশাক',
        items: [
          { nameEn: 'Panjabi (পাঞ্জাবি)', nameBn: 'পাঞ্জাবি (সুতি, কাবলি, ডিজাইনার)', slug: 'panjabi', isHot: true },
          { nameEn: 'Pajama & Aligari', nameBn: 'পায়জামা ও আলিগড়ি', slug: 'pajama' },
          { nameEn: 'Lungi (লুঙ্গি)', nameBn: 'আমানত শাহ ও স্ট্যান্ডার্ড লুঙ্গি', slug: 'lungi', isHot: true },
          { nameEn: 'Koti & Waistcoats', nameBn: 'কোটি ও ওয়েস্টকোট', slug: 'koti' },
        ],
      },
      {
        groupTitleEn: 'Western & Casual Wear',
        groupTitleBn: 'ওয়েস্টার্ন ও ক্যাজুয়াল পোশাক',
        items: [
          { nameEn: 'Polo & Casual T-Shirts', nameBn: 'পোলো ও ক্যাজুয়াল টি-শার্ট', slug: 'mens-tshirts', isHot: true },
          { nameEn: 'Formal & Casual Shirts', nameBn: 'ফরমাল ও ক্যাজুয়াল শার্ট', slug: 'mens-shirts' },
          { nameEn: 'Denim Jeans & Chinos', nameBn: 'জিন্স প্যান্ট ও গ্যাবার্ডিন', slug: 'mens-jeans' },
          { nameEn: 'Hoodies & Jackets', nameBn: 'হুডি ও জ্যাকেট', slug: 'jackets' },
        ],
      },
      {
        groupTitleEn: 'Footwear & Accessories',
        groupTitleBn: 'জুতো ও এক্সেসরিজ',
        items: [
          { nameEn: 'Sneakers & Sports Shoes', nameBn: 'স্নিকার্স ও কেডস', slug: 'sneakers', isHot: true },
          { nameEn: 'Leather Formal Shoes', nameBn: 'চামড়ার ফরমাল জুতো (Apex/Bata)', slug: 'formal-shoes' },
          { nameEn: 'Leather Wallets & Belts', nameBn: 'লেদার মানিব্যাগ ও বেল্ট', slug: 'wallets' },
          { nameEn: 'Men’s Luxury Watches', nameBn: 'পুরুষদের ঘড়ি (Curren/Naviforce)', slug: 'mens-watches' },
        ],
      },
    ],
  },
  {
    id: 'phones-tablets',
    nameEn: 'Smartphones & Tablets',
    nameBn: 'স্মার্টফোন ও ট্যাবলেট',
    slug: 'phones',
    icon: Smartphone,
    featuredBanner: {
      titleEn: 'Official Smartphone Launches',
      titleBn: 'অফিসিয়াল স্মার্টফোন লঞ্চ অফার',
      tagEn: '0% EMI Available',
      tagBn: '০% ইএমআই সুবিধা',
      link: '/wevmall?category=phones',
    },
    subgroups: [
      {
        groupTitleEn: 'Smartphones by Brand',
        groupTitleBn: 'ব্র্যান্ড অনুযায়ী স্মার্টফোন',
        items: [
          { nameEn: 'Xiaomi / Redmi', nameBn: 'শাওমি / রেডমি স্মার্টফোন', slug: 'xiaomi', isHot: true },
          { nameEn: 'Samsung Galaxy', nameBn: 'স্যামসাং গ্যালাক্সি স্মার্টফোন', slug: 'samsung', isHot: true },
          { nameEn: 'Realme Phones', nameBn: 'রিয়েলমি ফোন কালেকশন', slug: 'realme' },
          { nameEn: 'Infinix & Tecno', nameBn: 'ইনফিনিক্স ও টেকনো মোবাইল', slug: 'infinix' },
          { nameEn: 'Walton Smartphones', nameBn: 'ওয়ালটন প্রিমো স্মার্টফোন', slug: 'walton-mobile', isHot: true },
          { nameEn: 'Apple iPhone', nameBn: 'অ্যাপল আইফোন কালেকশন', slug: 'iphone' },
        ],
      },
      {
        groupTitleEn: 'Feature & Button Phones',
        groupTitleBn: 'বাটন ও ফিচার ফোন',
        items: [
          { nameEn: 'Symphony Feature Phones', nameBn: 'সিম্ফনি বাটন ফোন', slug: 'symphony' },
          { nameEn: 'Nokia Keypad Phones', nameBn: 'নোকিয়া ফিচার ফোন', slug: 'nokia' },
          { nameEn: 'Walton Olvio Phones', nameBn: 'ওয়ালটন অলভিও বাটন ফোন', slug: 'walton-button' },
        ],
      },
      {
        groupTitleEn: 'Tablets & iPads',
        groupTitleBn: 'ট্যাবলেট ও আইপ্যাড',
        items: [
          { nameEn: 'Apple iPad & Air', nameBn: 'অ্যাপল আইপ্যাড ও এয়ার', slug: 'ipad' },
          { nameEn: 'Android Tablets (Samsung/Lenovo)', nameBn: 'অ্যান্ড্রয়েড ট্যাবলেট', slug: 'android-tablets' },
          { nameEn: 'Kids Learning Tablets', nameBn: 'বাচ্চাদের শিক্ষামূলক ট্যাব', slug: 'kids-tablets' },
        ],
      },
    ],
  },
  {
    id: 'tv-appliances',
    nameEn: 'TV & Home Appliances',
    nameBn: 'টিভি ও হোম অ্যাপ্লায়েন্স',
    slug: 'home-living',
    icon: Tv,
    featuredBanner: {
      titleEn: 'Walton & Samsung Smart TVs',
      titleBn: 'ওয়ালটন ও স্যামসাং স্মার্ট টিভি উৎসব',
      tagEn: 'Official Warranty',
      tagBn: 'অফিসিয়াল ওয়ারেন্টি',
      link: '/wevmall?category=electronics',
    },
    subgroups: [
      {
        groupTitleEn: 'Televisions (টিভি)',
        groupTitleBn: 'স্মার্ট ও এলইডি টেলিভিশন',
        items: [
          { nameEn: 'Android Smart TVs (32"-65")', nameBn: 'অ্যান্ড্রয়েড স্মার্ট টিভি (৩২"-৬৫")', slug: 'smart-tvs', isHot: true },
          { nameEn: 'Walton LED TVs', nameBn: 'ওয়ালটন এলইডি টিভি', slug: 'walton-tv', isHot: true },
          { nameEn: '4K UHD Voice Control TVs', nameBn: '৪কে ইউএইচডি ভয়েস কন্ট্রোল টিভি', slug: '4k-tvs' },
          { nameEn: 'TV Wall Mounts & Brackets', nameBn: 'টিভি ওয়াল মাউন্ট ও রিমোট', slug: 'tv-accessories' },
        ],
      },
      {
        groupTitleEn: 'Large Appliances',
        groupTitleBn: 'ফ্রিজ, এসি ও ওয়াশিং মেশিন',
        items: [
          { nameEn: 'Refrigerators & Freezers', nameBn: 'ফ্রিজ ও ডিপ ফ্রিজার (Walton/Singer)', slug: 'refrigerators', isHot: true },
          { nameEn: 'Inverter Air Conditioners (AC)', nameBn: 'ইনভার্টার এয়ার কন্ডিশনার (এসি)', slug: 'air-conditioners', isHot: true },
          { nameEn: 'Washing Machines', nameBn: 'অটোমেটিক ওয়াশিং মেশিন', slug: 'washing-machines' },
        ],
      },
      {
        groupTitleEn: 'Kitchen Appliances',
        groupTitleBn: 'রান্নাঘরের ছোট যন্ত্রপাতি',
        items: [
          { nameEn: 'Blenders & Grinders (বিলেন্ডার)', nameBn: 'ব্লেন্ডার, মিক্সার ও জুসার', slug: 'blenders', isHot: true },
          { nameEn: 'Rice Cookers & Induction', nameBn: 'রাইস কুকার ও ইন্ডাকশন চুলা', slug: 'rice-cookers' },
          { nameEn: 'Microwave & Electric Ovens', nameBn: 'মাইক্রোওয়েভ ও ইলেকট্রিক ওভেন', slug: 'ovens' },
          { nameEn: 'Air Fryers & Kettles', nameBn: 'এয়ার ফ্রায়ার ও ইলেকট্রিক কেটলি', slug: 'air-fryers' },
        ],
      },
    ],
  },
  {
    id: 'electronic-accessories',
    nameEn: 'Electronic Accessories',
    nameBn: 'ইলেকট্রনিক এক্সেসরিজ',
    slug: 'accessories',
    icon: Headphones,
    featuredBanner: {
      titleEn: 'TWS Earbuds & Fast Chargers',
      titleBn: 'টিডব্লিউএস ব্লুটুথ ইয়ারবাডস ও ফাস্ট চার্জার',
      tagEn: 'Flash Deals',
      tagBn: 'ফ্ল্যাশ অফার',
      link: '/wevmall?category=accessories',
    },
    subgroups: [
      {
        groupTitleEn: 'Audio & Sound',
        groupTitleBn: 'অডিও ও মিউজিক এক্সেসরিজ',
        items: [
          { nameEn: 'TWS Wireless Earbuds', nameBn: 'টিডব্লিউএস ট্রু ওয়্যারলেস ইয়ারবাড', slug: 'tws-earbuds', isHot: true },
          { nameEn: 'Bluetooth Neckbands', nameBn: 'ব্লুটুথ নেকব্যান্ড হেডফোন', slug: 'neckbands', isHot: true },
          { nameEn: 'Bluetooth Portable Speakers', nameBn: 'ওয়্যারলেস ব্লুটুথ স্পিকার', slug: 'speakers' },
          { nameEn: 'Over-Ear Gaming Headphones', nameBn: 'গেমিং হেডফোন উইথ মাইক', slug: 'headphones' },
        ],
      },
      {
        groupTitleEn: 'Charging & Power',
        groupTitleBn: 'চার্জার, ক্যাবল ও পাওয়ার ব্যাংক',
        items: [
          { nameEn: 'Fast Charging Adapters (65W/33W)', nameBn: 'ফাস্ট চার্জিং অ্যাডাপ্টার (GaN)', slug: 'chargers' },
          { nameEn: 'Power Banks (10000-30000mAh)', nameBn: 'পাওয়ার ব্যাংক (Remax/Baseus)', slug: 'power-banks', isHot: true },
          { nameEn: 'Type-C & Lightning Cables', nameBn: 'টাইপ-সি ও ব্রেইডেড ক্যাবল', slug: 'cables' },
        ],
      },
      {
        groupTitleEn: 'Smartwatches & Cases',
        groupTitleBn: 'স্মার্টওয়াচ ও মোবাইল কভার',
        items: [
          { nameEn: 'Calling Smartwatches', nameBn: 'ব্লুটুথ কলিং স্মার্টওয়াচ (Haylou/Kieslect)', slug: 'smartwatches', isHot: true },
          { nameEn: 'Shockproof Cases & Covers', nameBn: 'মোবাইল ব্যাককভার ও গ্লাস প্রটেক্টর', slug: 'phone-cases' },
          { nameEn: 'Camera Gimbals & Tripods', nameBn: 'ট্রাইপড, রিং লাইট ও জিম্বল', slug: 'tripods' },
        ],
      },
    ],
  },
  {
    id: 'health-beauty',
    nameEn: 'Health & Beauty',
    nameBn: 'স্বাস্থ্য ও সৌন্দর্য',
    slug: 'beauty',
    icon: Sparkles,
    featuredBanner: {
      titleEn: '100% Authentic Skincare',
      titleBn: '১০০% আসল স্কিনকেয়ার ও কসমেটিক্স',
      tagEn: 'Unilever & Marico',
      tagBn: 'ইউনিলিভার ও মেরিকো',
      link: '/wevmall?category=beauty',
    },
    subgroups: [
      {
        groupTitleEn: 'Skin & Body Care',
        groupTitleBn: 'স্কিন ও বডি কেয়ার',
        items: [
          { nameEn: 'Face Wash & Cleansers', nameBn: 'ফেস ওয়াশ ও ক্লিনজার (Simple/Himalaya)', slug: 'face-wash', isHot: true },
          { nameEn: 'Sunscreen & SPF Lotions', nameBn: 'সানস্ক্রিন ও ডে ক্রিম', slug: 'sunscreen', isHot: true },
          { nameEn: 'Moisturizers & Serums', nameBn: 'ময়েশ্চারাইজার ও ফেস সিরাম', slug: 'serums' },
          { nameEn: 'Body Lotion & Wash', nameBn: 'বডি লোশন ও শাওয়ার জেল', slug: 'body-wash' },
        ],
      },
      {
        groupTitleEn: 'Hair Care & Fragrances',
        groupTitleBn: 'হেয়ার কেয়ার ও সুগন্ধি',
        items: [
          { nameEn: 'Shampoo & Conditioners', nameBn: 'শ্যাম্পু ও কন্ডিশনার (Sunsilk/Tresemme)', slug: 'shampoo' },
          { nameEn: 'Coconut & Herbal Hair Oils', nameBn: 'প্যারাসুট নারিকেল ও হারবাল তেল', slug: 'hair-oil' },
          { nameEn: 'Attar & Long-Lasting Perfumes', nameBn: 'আতর ও প্রিমিয়াম পারফিউম', slug: 'perfumes', isHot: true },
          { nameEn: 'Body Sprays & Deodorants', nameBn: 'বডি স্প্রে ও ডিওডোরেন্ট (Fogg/Axe)', slug: 'body-sprays' },
        ],
      },
      {
        groupTitleEn: "Men's Grooming & Health",
        groupTitleBn: 'পুরুষদের গ্রুমিং ও স্বাস্থ্য',
        items: [
          { nameEn: 'Beard Trimmers & Shavers', nameBn: 'দাড়ি ট্রিমার ও হেয়ার ক্লিপার', slug: 'trimmers', isHot: true },
          { nameEn: 'Shaving Foams & Razors', nameBn: 'শেভিং ফোম ও ব্লেড', slug: 'shaving' },
          { nameEn: 'BP Monitors & Glucometers', nameBn: 'প্রেসার মাপার মেশিন ও গ্লুকোমিটার', slug: 'medical-devices' },
        ],
      },
    ],
  },
  {
    id: 'groceries-bazaar',
    nameEn: 'Groceries & Daily Bazaar',
    nameBn: 'মুদি ও নিত্যবাজার',
    slug: 'agriculture',
    icon: ShoppingBasket,
    featuredBanner: {
      titleEn: 'Fresh Daily Grocery Bazaar',
      titleBn: 'টাটকা মুদি ও নিত্যবাজার',
      tagEn: 'Fast Express Delivery',
      tagBn: 'দ্রুত এক্সপ্রেস ডেলিভারি',
      link: '/wevmall?category=agriculture',
    },
    subgroups: [
      {
        groupTitleEn: 'Daily Cooking Essentials',
        groupTitleBn: 'রান্নার প্রয়োজনীয় মুদি',
        items: [
          { nameEn: 'Miniket & Nazirshail Rice (চাল)', nameBn: 'মিনিকেট ও নাজিরশাইল চাল', slug: 'rice', isHot: true },
          { nameEn: 'Mustard & Soybean Oil', nameBn: 'সরিষার তেল ও সয়াবিন তেল (Radhuni/Teer)', slug: 'oil', isHot: true },
          { nameEn: 'Pure Spices & Masala', nameBn: 'রাধুনী হলুদ, মরিচ ও গুঁড়া মসলা', slug: 'spices' },
          { nameEn: 'Lentils & Pulses (ডাল)', nameBn: 'মসুর ডাল ও মুগ ডাল', slug: 'lentils' },
        ],
      },
      {
        groupTitleEn: 'Breakfast & Dairy',
        groupTitleBn: 'সকালের নাস্তা ও দুগ্ধজাত',
        items: [
          { nameEn: 'Full Cream Milk Powder', nameBn: 'গুঁড়ো দুধ (Dano/Marks/Diploma)', slug: 'milk-powder', isHot: true },
          { nameEn: 'Premium Tea & Coffee', nameBn: 'ইস্পাহানি চা ও কফি', slug: 'tea-coffee' },
          { nameEn: 'Pure Sundarban Honey & Ghee', nameBn: 'খাঁটি সুন্দরবনের মধু ও গাওয়া ঘি', slug: 'honey-ghee', isHot: true },
          { nameEn: 'Biscuits & Cookies', nameBn: 'বিস্কুট, চানাচুর ও স্ন্যাকস', slug: 'biscuits' },
        ],
      },
      {
        groupTitleEn: 'Cleaning & Household',
        groupTitleBn: 'ক্লিনিং ও গৃহস্থালী',
        items: [
          { nameEn: 'Laundry Detergent & Soap', nameBn: 'হুইল/রিন ডিটারজেন্ট পাউডার', slug: 'detergents' },
          { nameEn: 'Dishwashing Bars & Liquids', nameBn: 'ভিম লিকুইড ও সাবান', slug: 'dishwash' },
          { nameEn: 'Insect Spray & Mosquito Coils', nameBn: 'মশার কয়েল ও স্প্রে', slug: 'insect-killers' },
        ],
      },
    ],
  },
  {
    id: 'babies-toys',
    nameEn: 'Babies & Toys',
    nameBn: 'মা ও শিশু',
    slug: 'digital',
    icon: Baby,
    subgroups: [
      {
        groupTitleEn: 'Diapering & Care',
        groupTitleBn: 'ডায়াপার ও বেবি কেয়ার',
        items: [
          { nameEn: 'Baby Diaper Pants (S-XXL)', nameBn: 'বেবি ডায়াপার প্যান্টস (Pampers/Twinkle)', slug: 'diapers', isHot: true },
          { nameEn: 'Fragrance-Free Wet Wipes', nameBn: 'অ্যালকোহলমুক্ত বেবি ওয়েট ওয়াইপ্স', slug: 'baby-wipes' },
          { nameEn: 'Baby Lotion, Powder & Oil', nameBn: 'জনসন বেবি লোশন ও তেল', slug: 'baby-lotion' },
        ],
      },
      {
        groupTitleEn: 'Baby Feeding & Nursery',
        groupTitleBn: 'খাবার ও বেবি গিয়ার',
        items: [
          { nameEn: 'Feeding Bottles & Sippers', nameBn: 'ফিডিং বোতল ও সিপার কাপ', slug: 'feeding-bottles' },
          { nameEn: 'Baby Walkers & Strollers', nameBn: 'বেবি ওয়াকার ও স্ট্রলার ট্রলি', slug: 'strollers', isHot: true },
          { nameEn: 'Educational & Remote Toys', nameBn: 'শিক্ষামূলক খেলনা ও আরসি কার', slug: 'toys' },
        ],
      },
    ],
  },
  {
    id: 'home-lifestyle',
    nameEn: 'Home & Lifestyle',
    nameBn: 'হোম ও লাইফস্টাইল',
    slug: 'home',
    icon: Sofa,
    subgroups: [
      {
        groupTitleEn: 'Bedding & Furnishing',
        groupTitleBn: 'বিছানা ও ঘরের সাজসজ্জা',
        items: [
          { nameEn: 'Pure Cotton Bedsheets', nameBn: '১০০% কটন বেডশিট ও চাদর সেট', slug: 'bedsheets', isHot: true },
          { nameEn: 'Curtains & Blinds', nameBn: 'ঘরের পর্দা ও জানালার কার্টেন', slug: 'curtains' },
          { nameEn: 'Comforters & Blankets', nameBn: 'কমফোর্টার, কম্বল ও লেপ কাভার', slug: 'blankets' },
        ],
      },
      {
        groupTitleEn: 'Kitchen & Dining',
        groupTitleBn: 'হাঁড়ি-পাতিল ও ডাইনিং',
        items: [
          { nameEn: 'Non-Stick Cookware Sets', nameBn: 'নন-স্টিক ফ্রাইপ্যান ও কুকার সেট', slug: 'cookware', isHot: true },
          { nameEn: 'Dinner Sets & Glassware', nameBn: 'ডিনার সেট ও কাঁচের তৈজসপত্র', slug: 'dinner-sets' },
          { nameEn: 'Vacuum Flasks & Bottles', nameBn: 'থার্মোফ্লাস্ক ও পানির বোতল', slug: 'flasks' },
        ],
      },
    ],
  },
  {
    id: 'sports-fitness',
    nameEn: 'Sports & Outdoors',
    nameBn: 'খেলাধুলা ও ফিটনেস',
    slug: 'sports',
    icon: Trophy,
    subgroups: [
      {
        groupTitleEn: 'Fitness Equipment',
        groupTitleBn: 'ব্যায়াম ও ফিটনেস সরঞ্জাম',
        items: [
          { nameEn: 'Adjustable Dumbbells', nameBn: 'ডাম্বেল ও পুশ-আপ বার', slug: 'dumbbells' },
          { nameEn: 'Non-Slip Yoga Mats', nameBn: 'নন-স্লিপ যোগব্যায়াম ম্যাট', slug: 'yoga-mats', isHot: true },
          { nameEn: 'Fitness Resistance Bands', nameBn: 'ব্যায়ামের রাবার ব্যান্ড ও গ্রিপার', slug: 'resistance-bands' },
        ],
      },
      {
        groupTitleEn: 'Cricket & Football',
        groupTitleBn: 'ক্রিকেট ও ফুটবল গিয়ার',
        items: [
          { nameEn: 'Cricket Bats & Balls', nameBn: 'ক্রিকেট ব্যাট, বল ও কিটব্যাগ', slug: 'cricket', isHot: true },
          { nameEn: 'BD Cricket Team Jerseys', nameBn: 'বাংলাদেশ ক্রিকেট জার্সি', slug: 'jerseys', isHot: true },
          { nameEn: 'Footballs & Shin Guards', nameBn: 'ফুটবল ও গোলকিপার গ্লাভস', slug: 'football' },
        ],
      },
    ],
  },
  {
    id: 'motors-automotive',
    nameEn: 'Motors & Bikes',
    nameBn: 'মোটর ও বাইক এক্সেসরিজ',
    slug: 'vehicles',
    icon: Bike,
    subgroups: [
      {
        groupTitleEn: 'Rider Safety & Helmets',
        groupTitleBn: 'বাইকার নিরাপত্তা ও হেলমেট',
        items: [
          { nameEn: 'DOT Certified Helmets', nameBn: 'সার্টিফাইড বাইক হেলমেট (Steelbird/Studds)', slug: 'helmets', isHot: true },
          { nameEn: 'Riding Gloves & Jackets', nameBn: 'রাইডিং গ্লাভস ও প্রোটেক্টিভ জ্যাকেট', slug: 'riding-gear' },
          { nameEn: 'Bike Mobile Holders', nameBn: 'ওয়াটারপ্রুফ বাইক মোবাইল হোল্ডার', slug: 'bike-holders', isHot: true },
        ],
      },
      {
        groupTitleEn: 'Engine Oils & Bike Care',
        groupTitleBn: 'ইঞ্জিন অয়েল ও পার্টস',
        items: [
          { nameEn: '4T Engine Oils (Motul/Mobil)', nameBn: 'মোটুল/মবিল ফোর-টি ইঞ্জিন অয়েল', slug: 'engine-oil', isHot: true },
          { nameEn: 'LED Fog Lights & Horns', nameBn: 'বাইকের ফগ লাইট ও লাউড হর্ন', slug: 'bike-lights' },
          { nameEn: 'Tubeless Tyre Inflators', nameBn: 'পোর্টেবল টায়ার ইনফ্লেটর ও কিট', slug: 'tyre-inflator' },
        ],
      },
    ],
  },
  {
    id: 'books-stationery',
    nameEn: 'Books & Stationery',
    nameBn: 'বই ও স্টেশনারি',
    slug: 'books',
    icon: BookOpen,
    subgroups: [
      {
        groupTitleEn: 'Books & Novels',
        groupTitleBn: 'বই ও সাহিত্য',
        items: [
          { nameEn: 'Islamic & Motivational Books', nameBn: 'ইসলামিক ও আত্মউন্নয়নমূলক বই', slug: 'islamic-books', isHot: true },
          { nameEn: 'Bangla Fiction & Thrillers', nameBn: 'হুমায়ূন আহমেদ ও অনুবাদ থ্রিলার', slug: 'bangla-novels' },
          { nameEn: 'BCS & Job Exam Guides', nameBn: 'বিসিএস ও চাকরির প্রস্তুতি বই', slug: 'job-guides', isHot: true },
        ],
      },
      {
        groupTitleEn: 'Office & Art Supplies',
        groupTitleBn: 'অফিস ও স্কুল স্টেশনারি',
        items: [
          { nameEn: 'Hardcover Notebooks & Diaries', nameBn: 'ডায়েরি, খাতা ও স্পাইরাল নোটবুক', slug: 'notebooks' },
          { nameEn: 'Gel Pens & Color Pencils', nameBn: 'জেল পেন ও আর্ট কালার সেট', slug: 'pens' },
        ],
      },
    ],
  },
];

export function DepartmentMegaMenu() {
  const { t } = useMarketplaceLang();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeDept, setActiveDept] = useState<MegaCategoryItem>(MEGA_DEPARTMENTS[0]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (deptSlug: string, itemSlug: string) => {
    setIsOpen(false);
    navigate(`/wevmall?category=${encodeURIComponent(deptSlug)}&q=${encodeURIComponent(itemSlug)}`);
  };

  return (
    <div ref={containerRef} className="relative z-40">
      {/* Mega Menu Trigger Button (Daraz Header Parity) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 h-9 md:h-10 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 border shrink-0 ${
          isOpen
            ? 'bg-primary text-primary-foreground border-primary shadow-md'
            : 'bg-card text-foreground border-border hover:border-primary/60 hover:bg-primary/5'
        }`}
        aria-expanded={isOpen}
        title={t('Browse All Categories', 'সকল ক্যাটাগরি ব্রাউজ করুন')}
      >
        {isOpen ? <X size={16} /> : <Menu size={16} className="text-primary" />}
        <span className="hidden md:inline">{t('All Categories', 'সকল বিভাগ')}</span>
        <span className="inline md:hidden text-xs">{t('Categories', 'ক্যাটাগরি')}</span>
        <ChevronRight
          size={14}
          className={`transition-transform duration-200 hidden sm:inline ${isOpen ? 'rotate-90 text-primary-foreground' : 'text-muted-foreground'}`}
        />
      </button>

      {/* Cascading Mega Dropdown Menu (L1 Left Column -> L2/L3 Multi-Column Grid) */}
      {isOpen && (
        <div className="fixed inset-x-2 sm:inset-x-auto sm:absolute sm:left-0 top-auto mt-2 w-[calc(100vw-16px)] sm:w-[680px] lg:w-[940px] xl:w-[1040px] max-w-[96vw] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[440px] max-h-[75vh] overflow-hidden">
            {/* Left L1 Department Sidebar (Col 1-4) */}
            <div className="md:col-span-4 lg:col-span-3.5 bg-muted/40 border-r border-border overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1 flex items-center justify-between">
                <span>{t('Departments', 'মূল ক্যাটাগরিসমূহ')}</span>
                <LayoutGrid size={12} className="text-primary" />
              </div>
              {MEGA_DEPARTMENTS.map((dept) => {
                const isActive = activeDept.id === dept.id;
                const Icon = dept.icon;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onMouseEnter={() => setActiveDept(dept)}
                    onClick={() => setActiveDept(dept)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground hover:bg-muted hover:text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon size={15} className={isActive ? 'text-primary-foreground' : 'text-primary shrink-0'} />
                      <span className="truncate">{t(dept.nameEn, dept.nameBn)}</span>
                    </div>
                    <ChevronRight size={13} className={isActive ? 'text-primary-foreground' : 'text-muted-foreground/60'} />
                  </button>
                );
              })}
            </div>

            {/* Right L2 Sub-Groups & L3 Leaf Tags (Col 5-12) */}
            <div className="md:col-span-8 lg:col-span-8.5 p-4 sm:p-5 overflow-y-auto scrollbar-thin bg-card flex flex-col justify-between">
              <div>
                {/* Active Department Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <activeDept.icon className="text-primary w-5 h-5" />
                    <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                      {t(activeDept.nameEn, activeDept.nameBn)}
                    </h3>
                  </div>
                  <Link
                    to={`/wevmall?category=${encodeURIComponent(activeDept.slug)}`}
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    {t('View All in Department →', 'সকল পণ্য দেখুন →')}
                  </Link>
                </div>

                {/* Sub-groups Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeDept.subgroups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {t(group.groupTitleEn, group.groupTitleBn)}
                      </h4>
                      <ul className="space-y-1.5">
                        {group.items.map((item, iIdx) => (
                          <li key={iIdx}>
                            <button
                              type="button"
                              onClick={() => handleItemClick(activeDept.slug, item.nameEn)}
                              className="text-left text-xs text-muted-foreground hover:text-foreground hover:font-bold transition-colors inline-flex items-center gap-1.5 group"
                            >
                              <span className="group-hover:translate-x-0.5 transition-transform">
                                {t(item.nameEn, item.nameBn)}
                              </span>
                              {item.isHot && (
                                <span className="px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 text-[9px] font-black uppercase flex items-center gap-0.5">
                                  <Flame size={9} /> HOT
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Promotional Department Banner Card */}
              {activeDept.featuredBanner && (
                <div className="mt-6 p-3.5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center justify-between gap-3">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider mb-1">
                      {t(activeDept.featuredBanner.tagEn, activeDept.featuredBanner.tagBn)}
                    </span>
                    <h5 className="text-xs sm:text-sm font-extrabold text-foreground">
                      {t(activeDept.featuredBanner.titleEn, activeDept.featuredBanner.titleBn)}
                    </h5>
                  </div>
                  <Link
                    to={activeDept.featuredBanner.link}
                    onClick={() => setIsOpen(false)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                  >
                    {t('Shop Now', 'কিনুন')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
