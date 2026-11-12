import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck,
  RotateCcw,
  ShieldCheck,
  Banknote,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { useMarketplaceLang } from './useMarketplaceLang';

export interface BangladeshLocation {
  division: string;
  divisionBn: string;
  districts: {
    name: string;
    nameBn: string;
    isDhakaMetro?: boolean;
  }[];
}

export const BD_DIVISIONS_DATA: BangladeshLocation[] = [
  {
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    districts: [
      { name: 'Dhaka - North (Banani, Gulshan, Uttara)', nameBn: 'ঢাকা উত্তর (বনানী, গুলশান, উত্তরা)', isDhakaMetro: true },
      { name: 'Dhaka - South (Dhanmondi, Motijheel, Old Dhaka)', nameBn: 'ঢাকা দক্ষিণ (ধানমন্ডি, মতিঝিল, পুরান ঢাকা)', isDhakaMetro: true },
      { name: 'Gazipur', nameBn: 'গাজীপুর' },
      { name: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ' },
      { name: 'Tangail', nameBn: 'টাঙ্গাইল' },
      { name: 'Faridpur', nameBn: 'ফরিদপুর' },
      { name: 'Manikganj', nameBn: 'মানিকগঞ্জ' },
      { name: 'Munshiganj', nameBn: 'মুন্সীগঞ্জ' },
      { name: 'Narsingdi', nameBn: 'নরসিংদী' },
      { name: 'Gopalganj', nameBn: 'গোপালগঞ্জ' },
      { name: 'Madaripur', nameBn: 'মাদারীপুর' },
      { name: 'Rajbari', nameBn: 'রাজবাড়ী' },
      { name: 'Shariatpur', nameBn: 'শরীয়তপুর' },
      { name: 'Kishoreganj', nameBn: 'কিশোরগঞ্জ' },
    ],
  },
  {
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    districts: [
      { name: 'Chattogram City', nameBn: 'চট্টগ্রাম মহানগর' },
      { name: "Cox's Bazar", nameBn: 'কক্সবাজার' },
      { name: 'Cumilla', nameBn: 'কুমিল্লা' },
      { name: 'Feni', nameBn: 'ফেনী' },
      { name: 'Noakhali', nameBn: 'নোয়াখালী' },
      { name: 'Brahmanbaria', nameBn: 'ব্রাহ্মণবাড়িয়া' },
      { name: 'Chandpur', nameBn: 'চাঁদপুর' },
      { name: 'Lakshmipur', nameBn: 'লক্ষ্মীপুর' },
      { name: 'Bandarban', nameBn: 'বান্দরবান' },
      { name: 'Rangamati', nameBn: 'রাঙ্গামাটি' },
      { name: 'Khagrachhari', nameBn: 'খাগড়াছড়ি' },
    ],
  },
  {
    division: 'Rajshahi',
    divisionBn: 'রাজশাহী',
    districts: [
      { name: 'Rajshahi City', nameBn: 'রাজশাহী মহানগর' },
      { name: 'Bogura', nameBn: 'বগুড়া' },
      { name: 'Pabna', nameBn: 'পাবনা' },
      { name: 'Sirajganj', nameBn: 'সিরাজগঞ্জ' },
      { name: 'Naogaon', nameBn: 'নওগাঁ' },
      { name: 'Natore', nameBn: 'নাটোর' },
      { name: 'Chapai Nawabganj', nameBn: 'চাঁপাইনবাবগঞ্জ' },
      { name: 'Joypurhat', nameBn: 'জয়পুরহাট' },
    ],
  },
  {
    division: 'Khulna',
    divisionBn: 'খুলনা',
    districts: [
      { name: 'Khulna City', nameBn: 'খুলনা মহানগর' },
      { name: 'Jashore', nameBn: 'যশোর' },
      { name: 'Kushtia', nameBn: 'কুষ্টিয়া' },
      { name: 'Satkhira', nameBn: 'সাতক্ষীরা' },
      { name: 'Bagerhat', nameBn: 'বাগেরহাট' },
      { name: 'Jhenaidah', nameBn: 'ঝিনাইদহ' },
      { name: 'Chuadanga', nameBn: 'চুয়াডাঙ্গা' },
      { name: 'Magura', nameBn: 'মাগুরা' },
      { name: 'Meherpur', nameBn: 'মেহেরপুর' },
      { name: 'Narail', nameBn: 'নড়াইল' },
    ],
  },
  {
    division: 'Sylhet',
    divisionBn: 'সিলেট',
    districts: [
      { name: 'Sylhet Sadar', nameBn: 'সিলেট সদর' },
      { name: 'Moulvibazar', nameBn: 'মৌলভীবাজার' },
      { name: 'Habiganj', nameBn: 'হবিগঞ্জ' },
      { name: 'Sunamganj', nameBn: 'সুনামগঞ্জ' },
    ],
  },
  {
    division: 'Barishal',
    divisionBn: 'বরিশাল',
    districts: [
      { name: 'Barishal City', nameBn: 'বরিশাল মহানগর' },
      { name: 'Patuakhali', nameBn: 'পটুয়াখালী' },
      { name: 'Bhola', nameBn: 'ভোলা' },
      { name: 'Pirojpur', nameBn: 'পিরোজপুর' },
      { name: 'Barguna', nameBn: 'বরগুনা' },
      { name: 'Jhalokati', nameBn: 'ঝালকাঠি' },
    ],
  },
  {
    division: 'Rangpur',
    divisionBn: 'রংপুর',
    districts: [
      { name: 'Rangpur Sadar', nameBn: 'রংপুর সদর' },
      { name: 'Dinajpur', nameBn: 'দিনাজপুর' },
      { name: 'Gaibandha', nameBn: 'গাইবান্ধা' },
      { name: 'Kurigram', nameBn: 'কুড়িগ্রাম' },
      { name: 'Lalmonirhat', nameBn: 'লালমনিরহাট' },
      { name: 'Nilphamari', nameBn: 'নীলফামারী' },
      { name: 'Panchagarh', nameBn: 'পঞ্চগড়' },
      { name: 'Thakurgaon', nameBn: 'ঠাকুরগাঁও' },
    ],
  },
  {
    division: 'Mymensingh',
    divisionBn: 'ময়মনসিংহ',
    districts: [
      { name: 'Mymensingh Sadar', nameBn: 'ময়মনসিংহ সদর' },
      { name: 'Jamalpur', nameBn: 'জামালপুর' },
      { name: 'Netrokona', nameBn: 'নেত্রকোণা' },
      { name: 'Sherpur', nameBn: 'শেরপুর' },
    ],
  },
];

interface DeliveryOptionsCardProps {
  productPrice?: number;
  freeShippingThreshold?: number;
}

export default function DeliveryOptionsCard({
  productPrice = 0,
  freeShippingThreshold = 1999,
}: DeliveryOptionsCardProps) {
  const { t, formatNum } = useMarketplaceLang();

  // Stored location preference in localStorage
  const [selectedDivision, setSelectedDivision] = useState<string>(() => {
    return localStorage.getItem('wevmall_deliv_division') || 'Dhaka';
  });
  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => {
    return localStorage.getItem('wevmall_deliv_district') || 'Dhaka - North (Banani, Gulshan, Uttara)';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isDhaka = selectedDistrict.includes('Dhaka');
  const deliveryDays = isDhaka ? '2 - 3' : '4 - 7';
  const deliveryFee = productPrice >= freeShippingThreshold ? 0 : isDhaka ? 60 : 120;

  const handleSelectLocation = (division: string, district: string) => {
    setSelectedDivision(division);
    setSelectedDistrict(district);
    localStorage.setItem('wevmall_deliv_division', division);
    localStorage.setItem('wevmall_deliv_district', district);
    setIsModalOpen(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header with Title & Daraz Parity Location Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Truck className="text-primary w-5 h-5" />
          <h3 className="font-extrabold text-sm sm:text-base text-foreground">
            {t('Delivery & Services', 'ডেলিভারি ও সেবা')}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          {t('Change Location', 'ঠিকানা পরিবর্তন')} →
        </button>
      </div>

      {/* Selected Location Pill */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/70">
        <MapPin className="text-primary w-4 h-4 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 text-xs">
          <p className="text-muted-foreground font-medium">
            {t('Delivering to:', 'ডেলিভারি গন্তব্য:')}
          </p>
          <p className="font-bold text-foreground truncate">
            {selectedDivision}, {selectedDistrict}
          </p>
        </div>
      </div>

      {/* Standard Delivery Option */}
      <div className="space-y-3 pt-1">
        <div className="flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-foreground">
                  {t('Standard Delivery', 'স্ট্যান্ডার্ড ডেলিভারি')}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">
                  {isDhaka ? t('Express', 'এক্সপ্রেস') : t('Nationwide', 'সারাদেশে')}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t(
                  `Estimated delivery within ${deliveryDays} business days`,
                  `সম্ভাব্য ডেলিভারি ${formatNum(deliveryDays)} কার্যদিবসের মধ্যে`,
                )}
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                {t('Couriers: WevExpress, Steadfast, RedX, Pathao', 'কুরিয়ার: উইভএক্সপ্রেস, স্টেডফাস্ট, রেডএক্স, পাঠাও')}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            {deliveryFee === 0 ? (
              <span className="font-extrabold text-emerald-500 uppercase text-xs">
                {t('Free Delivery', 'ফ্রি ডেলিভারি')}
              </span>
            ) : (
              <span className="font-extrabold text-foreground text-xs sm:text-sm">
                ৳{formatNum(deliveryFee)}
              </span>
            )}
          </div>
        </div>

        {/* Cash on Delivery Badge */}
        <div className="flex items-start gap-2.5 pt-2 border-t border-border/50 text-xs">
          <Banknote className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground">
                {t('Cash on Delivery (COD)', 'ক্যাশ অন ডেলিভারি (COD)')}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-black uppercase">
                {t('Available', 'উপলব্ধ')}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t('Pay with cash when package is delivered to your doorstep', 'পণ্য হাতে পেয়ে মূল্য পরিশোধের সুবিধা')}
            </p>
          </div>
        </div>

        {/* 14-Day Free Returns */}
        <div className="flex items-start gap-2.5 pt-2 border-t border-border/50 text-xs">
          <RotateCcw className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-foreground">
              {t('14 Days Easy Return', '১৪ দিনের সহজ রিটার্ন পলিসি')}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t('Free returns if item is damaged, defective or not as described', 'ত্রুটিযুক্ত বা বর্ণনার সাথে অমিল থাকলে বিনামূল্যে রিটার্ন')}
            </p>
          </div>
        </div>

        {/* 100% Authentic Guarantee */}
        <div className="flex items-start gap-2.5 pt-2 border-t border-border/50 text-xs">
          <ShieldCheck className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground">
                {t('100% Authentic Genuine', '১০০% আসল পণ্যের নিশ্চয়তা')}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase">
                {t('Verified', 'যাচাইকৃত')}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t('Money back guarantee backed by WevMall Escrow protection', 'উইভমল এসক্রো সুরক্ষায় মানি ব্যাক গ্যারান্টি')}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Location Selector Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="text-primary w-5 h-5" />
                <h3 className="font-black text-sm sm:text-base text-foreground">
                  {t('Select Delivery Destination (64 Districts)', 'ডেলিভারি জেলা ও এলাকা নির্বাচন করুন')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Division Tabs & Districts Grid */}
            <div className="p-4 overflow-y-auto scrollbar-thin space-y-4">
              <p className="text-xs text-muted-foreground">
                {t(
                  'Select your district to calculate accurate delivery ETA and courier charges.',
                  'সঠিক ডেলিভারি সময় ও খরচ দেখতে আপনার জেলা নির্বাচন করুন।',
                )}
              </p>

              <div className="space-y-4">
                {BD_DIVISIONS_DATA.map((divItem) => (
                  <div key={divItem.division} className="rounded-xl border border-border/80 p-3 bg-muted/20">
                    <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {t(divItem.division, divItem.divisionBn)} {t('Division', 'বিভাগ')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {divItem.districts.map((dist) => {
                        const isCurrent =
                          selectedDivision === divItem.division && selectedDistrict === dist.name;
                        return (
                          <button
                            key={dist.name}
                            type="button"
                            onClick={() => handleSelectLocation(divItem.division, dist.name)}
                            className={`p-2.5 rounded-lg text-left text-xs font-semibold transition-all flex items-center justify-between border ${
                              isCurrent
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5'
                            }`}
                          >
                            <span className="truncate">{t(dist.name, dist.nameBn)}</span>
                            {isCurrent && <CheckCircle2 size={14} className="text-primary-foreground shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-border bg-muted/30 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
              >
                {t('Close', 'বন্ধ করুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
