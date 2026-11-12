import type { WevsoftProductId } from './wevsoftProducts';

/**
 * Long-form, bilingual (English / Bangla) product guides shown in the Developer Console
 * Products tab. `scopes` lists only OAuth scopes that exist in pages/developer/devApi.ts
 * (OAUTH_SCOPES); products without a public scope say so instead of inventing APIs.
 */
export type ProductLang = 'en' | 'bn';

export interface ProductDetail {
  name: string;
  tagline: string;
  what: string;
  steps: string[];
  useCases: string[];
  gives: string[];
}

export interface ProductGuide {
  scopes: string[];
  en: ProductDetail;
  bn: ProductDetail;
}

export const PRODUCT_UI: Record<ProductLang, Record<string, string>> = {
  en: {
    title: 'Products',
    intro: 'Choose which Wevsoft products {app} works with. {n} of {total} added.',
    search: 'Search products',
    noMatch: 'No products match "{q}".',
    add: 'Add',
    added: 'Added',
    remove: 'Remove',
    details: 'Details',
    close: 'Close',
    what: 'What it is',
    how: 'How to use it',
    useCases: 'Example use cases',
    gives: 'What it gives your app',
    scopes: 'OAuth scopes',
    noScopes: 'No dedicated API scope yet. Use Wevsoft sign-in (openid, profile) and link people to the product.',
    open: 'Open {name}',
    addedToast: '{name} added to {app}',
    removedToast: '{name} removed',
    saveError: 'Could not save products. Try again.',
  },
  bn: {
    title: 'প্রোডাক্ট',
    intro: '{app} কোন কোন Wevsoft প্রোডাক্টের সাথে কাজ করবে বেছে নিন। {total}টির মধ্যে {n}টি যোগ করা হয়েছে।',
    search: 'প্রোডাক্ট খুঁজুন',
    noMatch: '"{q}" নামে কোনো প্রোডাক্ট পাওয়া যায়নি।',
    add: 'যোগ করুন',
    added: 'যোগ হয়েছে',
    remove: 'সরিয়ে দিন',
    details: 'বিস্তারিত',
    close: 'বন্ধ করুন',
    what: 'এটা কী',
    how: 'কীভাবে ব্যবহার করবেন',
    useCases: 'কোথায় কাজে লাগে',
    gives: 'আপনার অ্যাপ কী পাবে',
    scopes: 'OAuth স্কোপ',
    noScopes: 'এখনো আলাদা কোনো API স্কোপ নেই। Wevsoft সাইন-ইন (openid, profile) ব্যবহার করুন আর ব্যবহারকারীদের সরাসরি প্রোডাক্টে পাঠান।',
    open: '{name} খুলুন',
    addedToast: '{app}-এ {name} যোগ হয়েছে',
    removedToast: '{name} সরানো হয়েছে',
    saveError: 'প্রোডাক্ট সেভ করা যায়নি। আবার চেষ্টা করুন।',
  },
};

export const PRODUCT_GUIDES: Record<WevsoftProductId, ProductGuide> = {
  wevchat: {
    scopes: ['messages.read', 'messages.write'],
    en: {
      name: 'WevChat',
      tagline: 'Messages, group chats and calls.',
      what: 'WevChat is Wevsoft\'s messenger: one-to-one and group conversations, media sharing and calls.',
      steps: [
        'Add WevChat to your app here.',
        'In the OAuth tab, request the messages.read and/or messages.write scopes.',
        'Send people through the Wevsoft sign-in flow so they can approve access.',
        'Read or send messages only in conversations the user has allowed.',
        'In the Webhooks tab, subscribe to message.received, message.echo, message.read, message.reaction, message.edited, message.deleted, message.pinned, message.unpinned and conversation.created to get chat activity in real time.',
      ],
      useCases: ['Order or booking updates sent as a chat message', 'A support bot that answers customers in WevChat', 'Sharing content from your app straight into a conversation'],
      gives: ['Direct messages in conversations the user allows', 'Sending messages on the user\'s behalf', 'A familiar chat channel to reach your users', 'Live webhooks: message.received, message.echo, message.read, message.reaction, message.edited, message.deleted, message.pinned, message.unpinned, conversation.created', 'Coming soon: message.delivered, message.postback, messaging.optin, messaging.referral, conversation.handover, messaging.policy_enforcement, account.linking'],
    },
    bn: {
      name: 'WevChat',
      tagline: 'মেসেজ, গ্রুপ চ্যাট আর কল।',
      what: 'WevChat হলো Wevsoft-এর মেসেঞ্জার। এখানে একজনের সাথে বা গ্রুপে কথা বলা, ছবি-ফাইল পাঠানো আর কল করা যায়।',
      steps: [
        'এখান থেকে আপনার অ্যাপে WevChat যোগ করুন।',
        'OAuth ট্যাবে messages.read বা messages.write স্কোপ চেয়ে নিন।',
        'ব্যবহারকারীকে Wevsoft সাইন-ইনে পাঠান, যাতে তিনি অনুমতি দিতে পারেন।',
        'ব্যবহারকারী যেসব কথোপকথনে অনুমতি দিয়েছেন, শুধু সেখানেই মেসেজ পড়ুন বা পাঠান।',
        'চ্যাটের খবর সাথে সাথে পেতে Webhooks ট্যাবে message.received, message.echo, message.read, message.reaction, message.edited, message.deleted, message.pinned, message.unpinned আর conversation.created চালু করুন।',
      ],
      useCases: ['অর্ডার বা বুকিংয়ের আপডেট চ্যাটে পাঠানো', 'কাস্টমারের প্রশ্নের উত্তর দেওয়ার সাপোর্ট বট', 'আপনার অ্যাপ থেকে কোনো কনটেন্ট সরাসরি চ্যাটে শেয়ার করা'],
      gives: ['অনুমতি পাওয়া কথোপকথনের মেসেজ', 'ব্যবহারকারীর হয়ে মেসেজ পাঠানোর সুবিধা', 'ব্যবহারকারীর কাছে পৌঁছানোর পরিচিত একটা চ্যানেল', 'এখনই চালু webhook: message.received, message.echo, message.read, message.reaction, message.edited, message.deleted, message.pinned, message.unpinned, conversation.created', 'শিগগিরই আসছে: message.delivered, message.postback, messaging.optin, messaging.referral, conversation.handover, messaging.policy_enforcement, account.linking'],
    },
  },
  feed: {
    scopes: ['posts.read', 'posts.write', 'stories.read', 'stories.write', 'media.upload'],
    en: {
      name: 'Feed',
      tagline: 'Posts, comments and reactions on the home feed.',
      what: 'The Feed is where people share posts, photos and stories and react or comment on each other\'s updates.',
      steps: [
        'Add Feed to your app here.',
        'Request posts.read to read posts, posts.write to publish, and media.upload for photos or videos.',
        'Add stories.read / stories.write if you also work with 24-hour stories.',
        'Subscribe to post.created or comment.created in the Webhooks tab to react to new activity.',
      ],
      useCases: ['A scheduler that publishes posts at the best time', 'Auto-sharing a blog article or achievement to the user\'s feed', 'A dashboard of a user\'s post performance'],
      gives: ['The user\'s posts and comments', 'Publishing posts and stories on their behalf', 'Real-time post and comment webhooks'],
    },
    bn: {
      name: 'ফিড',
      tagline: 'হোম ফিডের পোস্ট, কমেন্ট আর রিঅ্যাকশন।',
      what: 'ফিডে মানুষ পোস্ট, ছবি আর স্টোরি শেয়ার করে, আর একে অপরের পোস্টে রিঅ্যাক্ট বা কমেন্ট করে।',
      steps: [
        'এখান থেকে আপনার অ্যাপে ফিড যোগ করুন।',
        'পোস্ট পড়তে posts.read, পোস্ট করতে posts.write, আর ছবি-ভিডিওর জন্য media.upload স্কোপ নিন।',
        '২৪ ঘণ্টার স্টোরি নিয়ে কাজ করলে stories.read / stories.write-ও নিন।',
        'নতুন পোস্ট বা কমেন্ট এলে জানতে Webhooks ট্যাবে post.created বা comment.created চালু করুন।',
      ],
      useCases: ['সঠিক সময়ে আপনাআপনি পোস্ট করার শিডিউলার', 'ব্লগ লেখা বা কোনো অর্জন ব্যবহারকারীর ফিডে শেয়ার করা', 'ব্যবহারকারীর পোস্ট কেমন চলছে তার ড্যাশবোর্ড'],
      gives: ['ব্যবহারকারীর পোস্ট আর কমেন্ট', 'তাঁর হয়ে পোস্ট ও স্টোরি দেওয়ার সুবিধা', 'পোস্ট আর কমেন্টের রিয়েল-টাইম webhook'],
    },
  },
  reels: {
    scopes: ['reels.read', 'reels.write', 'media.upload'],
    en: {
      name: 'Reels',
      tagline: 'Short-form vertical videos.',
      what: 'Reels are short vertical videos people watch, like, comment on and share in a full-screen player.',
      steps: [
        'Add Reels to your app here.',
        'Request reels.read to see a user\'s reels and stats, reels.write to publish them.',
        'Upload the video with media.upload, then publish it as a reel.',
        'Listen for reel.published in the Webhooks tab if you need to know when new reels go live.',
      ],
      useCases: ['A video editor that exports directly to Reels', 'Cross-posting short videos from another platform', 'Showing a creator\'s reel views and comments'],
      gives: ['The user\'s reels with views and comments', 'Publishing and managing reels', 'reel.published webhook events'],
    },
    bn: {
      name: 'রিলস',
      tagline: 'ছোট উল্লম্ব (vertical) ভিডিও।',
      what: 'রিলস হলো ছোট ছোট খাড়া ভিডিও। মানুষ এগুলো পুরো স্ক্রিনে দেখে, লাইক-কমেন্ট করে আর শেয়ার করে।',
      steps: [
        'এখান থেকে আপনার অ্যাপে রিলস যোগ করুন।',
        'ব্যবহারকারীর রিল আর তার পরিসংখ্যান দেখতে reels.read, রিল পোস্ট করতে reels.write নিন।',
        'media.upload দিয়ে ভিডিও আপলোড করে সেটাকে রিল হিসেবে প্রকাশ করুন।',
        'নতুন রিল প্রকাশ হলে জানতে Webhooks ট্যাবে reel.published চালু করুন।',
      ],
      useCases: ['ভিডিও এডিটর থেকে সরাসরি রিলসে পোস্ট করা', 'অন্য প্ল্যাটফর্মের ছোট ভিডিও এখানেও পোস্ট করা', 'ক্রিয়েটরের রিলের ভিউ আর কমেন্ট দেখানো'],
      gives: ['ভিউ ও কমেন্টসহ ব্যবহারকারীর রিল', 'রিল পোস্ট ও ম্যানেজ করার সুবিধা', 'reel.published webhook'],
    },
  },
  live: {
    scopes: ['livestream.read', 'livestream.write'],
    en: {
      name: 'Live',
      tagline: 'Live streams and live chat.',
      what: 'Live lets people broadcast video in real time while viewers watch and chat.',
      steps: [
        'Add Live to your app here.',
        'Request livestream.read to discover streams and read chat, livestream.write to schedule, start and end them.',
        'Let the user sign in and approve the scopes.',
        'Use the livestream.started, livestream.ended and livestream.comment webhooks to follow a stream.',
      ],
      useCases: ['Streaming software that goes live on Wevsoft with one click', 'A chat overlay or moderation tool for streamers', 'Alerting followers when a stream starts'],
      gives: ['Live and scheduled streams and their chat', 'Scheduling, starting and ending broadcasts', 'Stream start, end and comment webhooks'],
    },
    bn: {
      name: 'লাইভ',
      tagline: 'লাইভ স্ট্রিম আর লাইভ চ্যাট।',
      what: 'লাইভে কেউ সরাসরি ভিডিও সম্প্রচার করেন, আর দর্শকেরা একই সময়ে দেখেন ও চ্যাট করেন।',
      steps: [
        'এখান থেকে আপনার অ্যাপে লাইভ যোগ করুন।',
        'স্ট্রিম খুঁজতে আর চ্যাট পড়তে livestream.read, স্ট্রিম শিডিউল-শুরু-বন্ধ করতে livestream.write নিন।',
        'ব্যবহারকারীকে সাইন-ইন করিয়ে স্কোপগুলোর অনুমতি নিন।',
        'স্ট্রিমের খবর রাখতে livestream.started, livestream.ended আর livestream.comment webhook ব্যবহার করুন।',
      ],
      useCases: ['এক ক্লিকে Wevsoft-এ লাইভে যাওয়ার স্ট্রিমিং সফটওয়্যার', 'স্ট্রিমারদের জন্য চ্যাট ওভারলে বা মডারেশন টুল', 'লাইভ শুরু হলেই ফলোয়ারদের জানানো'],
      gives: ['চলমান ও শিডিউল করা স্ট্রিম আর তার চ্যাট', 'সম্প্রচার শিডিউল, শুরু ও বন্ধ করার সুবিধা', 'স্ট্রিম শুরু, শেষ আর কমেন্টের webhook'],
    },
  },
  'watch-party': {
    scopes: [],
    en: {
      name: 'Watch Party',
      tagline: 'Watch videos together in real time.',
      what: 'Watch Party lets friends watch the same video in sync and chat while they watch.',
      steps: [
        'Add Watch Party to your app here.',
        'Sign people in with Wevsoft (openid, profile) so you know who they are.',
        'Link them to /watch-party to start or join a party.',
        'Share the content you want watched as a post or reel so it can be played there.',
      ],
      useCases: ['A movie-night button inside a community app', 'Study groups watching a lecture together', 'A fan club watching a premiere at the same moment'],
      gives: ['A ready-made shared viewing experience', 'Signed-in users your app can recognise', 'More time people spend together around your content'],
    },
    bn: {
      name: 'ওয়াচ পার্টি',
      tagline: 'একসাথে, একই সময়ে ভিডিও দেখা।',
      what: 'ওয়াচ পার্টিতে বন্ধুরা একই ভিডিও একসাথে মিলিয়ে দেখতে পারেন, আর দেখতে দেখতে চ্যাট করতে পারেন।',
      steps: [
        'এখান থেকে আপনার অ্যাপে ওয়াচ পার্টি যোগ করুন।',
        'Wevsoft সাইন-ইন (openid, profile) দিয়ে ব্যবহারকারীকে চিনে নিন।',
        'পার্টি শুরু বা যোগ দেওয়ার জন্য তাঁদের /watch-party লিংকে পাঠান।',
        'যে ভিডিও দেখাতে চান সেটা পোস্ট বা রিল হিসেবে শেয়ার করুন, যাতে সেখানে চালানো যায়।',
      ],
      useCases: ['কমিউনিটি অ্যাপে "মুভি নাইট" বাটন', 'স্টাডি গ্রুপ মিলে একসাথে লেকচার দেখা', 'ফ্যান ক্লাবের সবাই একসাথে প্রিমিয়ার দেখা'],
      gives: ['তৈরি করা একসাথে-দেখার অভিজ্ঞতা', 'সাইন-ইন করা ব্যবহারকারী, যাঁদের আপনার অ্যাপ চেনে', 'আপনার কনটেন্ট ঘিরে মানুষের বেশি সময় কাটানো'],
    },
  },  wevmall: {
    scopes: ['marketplace.read', 'marketplace.write'],
    en: {
      name: 'WevMall',
      tagline: 'Marketplace products, shops and orders.',
      what: 'WevMall is Wevsoft\'s marketplace where sellers list products, run shops and receive orders.',
      steps: [
        'Add WevMall to your app here.',
        'Request marketplace.read to browse listings, marketplace.write to manage a seller\'s listings and orders.',
        'Optionally keep your catalog in sync from Product Catalog Feeds in the sidebar.',
        'Listen for product.created, product.updated and order.status_changed in the Webhooks tab.',
      ],
      useCases: ['An inventory tool that syncs stock to a WevMall shop', 'An order-management dashboard for sellers', 'A price comparison or product discovery app'],
      gives: ['Public listings and categories', 'Managing a seller\'s listings and orders', 'Product and order webhooks'],
    },
    bn: {
      name: 'WevMall',
      tagline: 'মার্কেটপ্লেসের প্রোডাক্ট, শপ আর অর্ডার।',
      what: 'WevMall হলো Wevsoft-এর মার্কেটপ্লেস। এখানে বিক্রেতারা প্রোডাক্ট তোলেন, শপ চালান আর অর্ডার পান।',
      steps: [
        'এখান থেকে আপনার অ্যাপে WevMall যোগ করুন।',
        'লিস্টিং দেখতে marketplace.read, বিক্রেতার লিস্টিং ও অর্ডার সামলাতে marketplace.write নিন।',
        'চাইলে সাইডবারের Product Catalog Feeds দিয়ে আপনার ক্যাটালগ সিঙ্ক রাখুন।',
        'Webhooks ট্যাবে product.created, product.updated আর order.status_changed চালু করুন।',
      ],
      useCases: ['স্টকের হিসাব WevMall শপের সাথে মিলিয়ে রাখার টুল', 'বিক্রেতাদের জন্য অর্ডার ম্যানেজমেন্ট ড্যাশবোর্ড', 'দাম তুলনা বা নতুন প্রোডাক্ট খোঁজার অ্যাপ'],
      gives: ['পাবলিক লিস্টিং আর ক্যাটাগরি', 'বিক্রেতার লিস্টিং ও অর্ডার ম্যানেজ করার সুবিধা', 'প্রোডাক্ট আর অর্ডারের webhook'],
    },
  },
  wallet: {
    scopes: [],
    en: {
      name: 'Wallet',
      tagline: 'Wevsoft digital wallet and payments.',
      what: 'Wallet holds a user\'s Wevsoft balance and is used to pay for orders, subscriptions and creator support.',
      steps: [
        'Add Wallet to your app here.',
        'Set up payouts for your own earnings under Monetization & Payouts in the sidebar.',
        'Sign people in with Wevsoft (profile) before they pay.',
        'Listen for the order.paid webhook to confirm a payment and unlock what was bought.',
      ],
      useCases: ['Selling premium features inside your app', 'Unlocking a course or download after payment', 'Tipping or supporting a creator'],
      gives: ['Payment confirmation through order.paid', 'Earnings and payouts for your app', 'A checkout people already trust'],
    },
    bn: {
      name: 'ওয়ালেট',
      tagline: 'Wevsoft ডিজিটাল ওয়ালেট আর পেমেন্ট।',
      what: 'ওয়ালেটে ব্যবহারকারীর Wevsoft ব্যালান্স থাকে। এটা দিয়ে অর্ডার, সাবস্ক্রিপশন বা ক্রিয়েটরকে সাপোর্টের টাকা দেওয়া যায়।',
      steps: [
        'এখান থেকে আপনার অ্যাপে ওয়ালেট যোগ করুন।',
        'নিজের আয় তোলার জন্য সাইডবারের Monetization & Payouts-এ পেআউট সেট করুন।',
        'পেমেন্টের আগে ব্যবহারকারীকে Wevsoft সাইন-ইন (profile) করান।',
        'পেমেন্ট নিশ্চিত হলে কেনা জিনিস চালু করতে order.paid webhook শুনুন।',
      ],
      useCases: ['অ্যাপের ভেতরে প্রিমিয়াম ফিচার বিক্রি', 'পেমেন্টের পর কোর্স বা ডাউনলোড খুলে দেওয়া', 'ক্রিয়েটরকে টিপ বা সাপোর্ট দেওয়া'],
      gives: ['order.paid দিয়ে পেমেন্টের নিশ্চয়তা', 'আপনার অ্যাপের আয় আর পেআউট', 'মানুষের আগে থেকে ভরসা করা চেকআউট'],
    },
  },
  wevspaces: {
    scopes: ['spaces.read', 'spaces.write', 'spaces.posts.write', 'spaces.events', 'spaces.manage'],
    en: {
      name: 'WevSpaces',
      tagline: 'Brand and business pages.',
      what: 'WevSpaces are pages for brands, businesses and organisations, run by a team with their own posts, events and inbox.',
      steps: [
        'Add WevSpaces to your app here.',
        'Request spaces.read to read a Space, spaces.write to update it, and spaces.posts.write to post as the Space.',
        'Ask for spaces.events or spaces.manage only if you need events or full automation.',
        'A Space admin approves your app; it then appears in that Space\'s developer console.',
      ],
      useCases: ['A social media manager that posts for several brands', 'Syncing business info (hours, contact) from a CRM', 'Publishing a Space\'s events from a ticketing tool'],
      gives: ['Space profile and metrics', 'Posting and managing content as the Space', 'Space events and app installation'],
    },
    bn: {
      name: 'WevSpaces',
      tagline: 'ব্র্যান্ড আর ব্যবসার পেজ।',
      what: 'WevSpaces হলো ব্র্যান্ড, ব্যবসা বা প্রতিষ্ঠানের পেজ। একটা টিম মিলে এটা চালায়, এর নিজস্ব পোস্ট, ইভেন্ট আর ইনবক্স থাকে।',
      steps: [
        'এখান থেকে আপনার অ্যাপে WevSpaces যোগ করুন।',
        'Space-এর তথ্য পড়তে spaces.read, আপডেট করতে spaces.write, আর Space-এর নামে পোস্ট করতে spaces.posts.write নিন।',
        'ইভেন্ট বা পুরো অটোমেশন লাগলে তবেই spaces.events বা spaces.manage চান।',
        'Space-এর অ্যাডমিন অনুমতি দিলে আপনার অ্যাপ সেই Space-এর ডেভেলপার কনসোলে দেখা যাবে।',
      ],
      useCases: ['একসাথে অনেক ব্র্যান্ডের হয়ে পোস্ট করার সোশ্যাল মিডিয়া টুল', 'CRM থেকে ব্যবসার তথ্য (সময়, যোগাযোগ) সিঙ্ক করা', 'টিকিটিং টুল থেকে Space-এর ইভেন্ট প্রকাশ করা'],
      gives: ['Space-এর প্রোফাইল আর পরিসংখ্যান', 'Space-এর নামে কনটেন্ট পোস্ট ও ম্যানেজ করা', 'Space-এর ইভেন্ট আর অ্যাপ ইনস্টল'],
    },
  },
  wevdesk: {
    scopes: ['spaces.inbox'],
    en: {
      name: 'WevDesk',
      tagline: 'Shared inbox and workflows for Spaces.',
      what: 'WevDesk is the team workspace for a Space: one shared inbox for customer messages plus simple automated workflows.',
      steps: [
        'Add WevDesk to your app here.',
        'Request the spaces.inbox scope.',
        'Have a Space admin approve your app for their Space.',
        'Read and reply to customer conversations from your helpdesk or CRM.',
      ],
      useCases: ['Connecting a helpdesk so agents answer from one place', 'An AI assistant that drafts replies to customers', 'Logging customer conversations in a CRM'],
      gives: ['The Space\'s customer messages', 'Replying on behalf of the Space', 'One place for the whole support team'],
    },
    bn: {
      name: 'WevDesk',
      tagline: 'Space-এর শেয়ার করা ইনবক্স আর ওয়ার্কফ্লো।',
      what: 'WevDesk হলো Space-এর টিমের কাজের জায়গা। কাস্টমারের সব মেসেজ এক ইনবক্সে আসে, সাথে সহজ কিছু অটোমেটেড ওয়ার্কফ্লো থাকে।',
      steps: [
        'এখান থেকে আপনার অ্যাপে WevDesk যোগ করুন।',
        'spaces.inbox স্কোপ চেয়ে নিন।',
        'Space-এর অ্যাডমিনকে দিয়ে তাঁর Space-এ আপনার অ্যাপের অনুমতি নিন।',
        'আপনার হেল্পডেস্ক বা CRM থেকেই কাস্টমারের মেসেজ পড়ুন আর উত্তর দিন।',
      ],
      useCases: ['হেল্পডেস্ক যুক্ত করে এক জায়গা থেকে উত্তর দেওয়া', 'কাস্টমারের জন্য উত্তরের খসড়া লিখে দেওয়া AI সহকারী', 'কাস্টমারের কথোপকথন CRM-এ সংরক্ষণ করা'],
      gives: ['Space-এর কাস্টমার মেসেজ', 'Space-এর হয়ে উত্তর দেওয়ার সুবিধা', 'পুরো সাপোর্ট টিমের জন্য এক জায়গা'],
    },
  },
  'creator-hub': {
    scopes: ['insights.read'],
    en: {
      name: 'Creator Hub',
      tagline: 'Creator tools, analytics and monetization.',
      what: 'Creator Hub is where creators manage content, see analytics and earn from their audience.',
      steps: [
        'Add Creator Hub to your app here.',
        'Request insights.read to read account and post performance.',
        'Combine it with posts.read or reels.read if you need the content itself.',
        'Show creators their numbers or suggestions inside your app.',
      ],
      useCases: ['A cross-platform analytics dashboard for creators', 'Weekly performance reports by email', 'Tools that suggest the best time to post'],
      gives: ['Account growth and engagement insights', 'Post-level performance data', 'A reason for creators to keep using your app'],
    },
    bn: {
      name: 'ক্রিয়েটর হাব',
      tagline: 'ক্রিয়েটরের টুল, অ্যানালিটিক্স আর আয়।',
      what: 'ক্রিয়েটর হাবে ক্রিয়েটররা নিজেদের কনটেন্ট সামলান, পরিসংখ্যান দেখেন আর দর্শকদের থেকে আয় করেন।',
      steps: [
        'এখান থেকে আপনার অ্যাপে ক্রিয়েটর হাব যোগ করুন।',
        'অ্যাকাউন্ট আর পোস্টের পারফরম্যান্স দেখতে insights.read নিন।',
        'কনটেন্টও লাগলে সাথে posts.read বা reels.read নিন।',
        'আপনার অ্যাপেই ক্রিয়েটরদের তাঁদের সংখ্যা বা পরামর্শ দেখান।',
      ],
      useCases: ['ক্রিয়েটরদের জন্য সব প্ল্যাটফর্মের অ্যানালিটিক্স এক ড্যাশবোর্ডে', 'প্রতি সপ্তাহে ইমেইলে পারফরম্যান্স রিপোর্ট', 'কখন পোস্ট করলে ভালো হবে তা জানানো টুল'],
      gives: ['অ্যাকাউন্টের বৃদ্ধি আর এনগেজমেন্টের তথ্য', 'প্রতিটি পোস্টের পারফরম্যান্স', 'ক্রিয়েটরদের বারবার আপনার অ্যাপে ফেরার কারণ'],
    },
  },
  jobs: {
    scopes: [],
    en: {
      name: 'Jobs',
      tagline: 'Job posts and applications.',
      what: 'Jobs is Wevsoft\'s job board: employers post openings and people apply with their profile.',
      steps: [
        'Add Jobs to your app here.',
        'Sign people in with Wevsoft (openid, profile).',
        'Link employers to /jobs to post a job, and candidates to a job page to apply.',
        'Use the profile scope to pre-fill a candidate\'s name and photo in your app.',
      ],
      useCases: ['A hiring tool that points candidates to Wevsoft job posts', 'A campus career portal for students', 'Sharing open roles in a company Space'],
      gives: ['Reach to job seekers on Wevsoft', 'Verified sign-in for candidates', 'A ready-made application flow'],
    },
    bn: {
      name: 'জবস',
      tagline: 'চাকরির পোস্ট আর আবেদন।',
      what: 'জবস হলো Wevsoft-এর চাকরির বোর্ড। নিয়োগকর্তারা চাকরির বিজ্ঞপ্তি দেন, আর মানুষ নিজের প্রোফাইল দিয়ে আবেদন করেন।',
      steps: [
        'এখান থেকে আপনার অ্যাপে জবস যোগ করুন।',
        'Wevsoft সাইন-ইন (openid, profile) দিয়ে ব্যবহারকারীকে লগইন করান।',
        'নিয়োগকর্তাকে চাকরি পোস্ট করতে /jobs-এ, আর প্রার্থীকে আবেদনের জন্য চাকরির পেজে পাঠান।',
        'profile স্কোপ দিয়ে প্রার্থীর নাম আর ছবি আগে থেকেই বসিয়ে দিন।',
      ],
      useCases: ['প্রার্থীদের Wevsoft-এর চাকরির পোস্টে পাঠানো হায়ারিং টুল', 'শিক্ষার্থীদের জন্য ক্যাম্পাস ক্যারিয়ার পোর্টাল', 'কোম্পানির Space-এ খালি পদ শেয়ার করা'],
      gives: ['Wevsoft-এ চাকরিপ্রার্থীদের কাছে পৌঁছানো', 'প্রার্থীদের যাচাই করা সাইন-ইন', 'তৈরি করা আবেদনের ধাপ'],
    },
  },
  groups: {
    scopes: ['groups.read', 'groups.write'],
    en: {
      name: 'Groups',
      tagline: 'Communities and group posts.',
      what: 'Groups are communities around a topic, where members post, comment and moderate together.',
      steps: [
        'Add Groups to your app here.',
        'Request groups.read to browse groups and posts, groups.write to create groups and post inside them.',
        'Let the user sign in and approve the scopes.',
        'Subscribe to group.post.created in the Webhooks tab to follow new posts.',
      ],
      useCases: ['A moderation bot for large communities', 'Posting announcements from a club or class app', 'Digest emails of the week\'s top group posts'],
      gives: ['Groups the user can see and their posts', 'Creating groups and posting in them', 'group.post.created webhook events'],
    },
    bn: {
      name: 'গ্রুপ',
      tagline: 'কমিউনিটি আর গ্রুপের পোস্ট।',
      what: 'গ্রুপ হলো কোনো বিষয় ঘিরে গড়ে ওঠা কমিউনিটি। সদস্যরা এখানে পোস্ট-কমেন্ট করেন আর মিলে গ্রুপ পরিচালনা করেন।',
      steps: [
        'এখান থেকে আপনার অ্যাপে গ্রুপ যোগ করুন।',
        'গ্রুপ আর পোস্ট দেখতে groups.read, গ্রুপ খুলতে ও পোস্ট করতে groups.write নিন।',
        'ব্যবহারকারীকে সাইন-ইন করিয়ে স্কোপের অনুমতি নিন।',
        'নতুন পোস্টের খবর পেতে Webhooks ট্যাবে group.post.created চালু করুন।',
      ],
      useCases: ['বড় কমিউনিটির জন্য মডারেশন বট', 'ক্লাব বা ক্লাসের অ্যাপ থেকে ঘোষণা পোস্ট করা', 'সপ্তাহের সেরা পোস্টগুলোর সারাংশ ইমেইলে পাঠানো'],
      gives: ['ব্যবহারকারী যেসব গ্রুপ দেখতে পান ও তার পোস্ট', 'গ্রুপ খোলা আর পোস্ট করার সুবিধা', 'group.post.created webhook'],
    },
  },
  events: {
    scopes: ['events.read', 'events.write'],
    en: {
      name: 'Events',
      tagline: 'Events and RSVPs.',
      what: 'Events lets people organise online or in-person events and collect RSVPs.',
      steps: [
        'Add Events to your app here.',
        'Request events.read to view events, events.write to create, edit and RSVP.',
        'Let the user sign in and approve the scopes.',
        'Use the event.created, event.updated and event.rsvp webhooks to keep your calendar in sync.',
      ],
      useCases: ['Syncing Wevsoft events to a calendar app', 'A ticketing tool that publishes events here', 'Reminders for people who RSVP\'d'],
      gives: ['Public events and the user\'s own events', 'Creating events and managing RSVPs', 'Event and RSVP webhooks'],
    },
    bn: {
      name: 'ইভেন্ট',
      tagline: 'ইভেন্ট আর RSVP।',
      what: 'ইভেন্টে মানুষ অনলাইন বা সরাসরি অনুষ্ঠান আয়োজন করেন, আর কারা আসবেন তা RSVP দিয়ে জেনে নেন।',
      steps: [
        'এখান থেকে আপনার অ্যাপে ইভেন্ট যোগ করুন।',
        'ইভেন্ট দেখতে events.read, তৈরি-এডিট আর RSVP করতে events.write নিন।',
        'ব্যবহারকারীকে সাইন-ইন করিয়ে স্কোপের অনুমতি নিন।',
        'ক্যালেন্ডার মিলিয়ে রাখতে event.created, event.updated আর event.rsvp webhook ব্যবহার করুন।',
      ],
      useCases: ['Wevsoft-এর ইভেন্ট ক্যালেন্ডার অ্যাপে সিঙ্ক করা', 'টিকিটিং টুল থেকে এখানে ইভেন্ট প্রকাশ', 'RSVP করা মানুষদের রিমাইন্ডার পাঠানো'],
      gives: ['পাবলিক ইভেন্ট আর ব্যবহারকারীর নিজের ইভেন্ট', 'ইভেন্ট তৈরি আর RSVP সামলানো', 'ইভেন্ট আর RSVP-এর webhook'],
    },
  },
  campus: {
    scopes: [],
    en: {
      name: 'My Campus',
      tagline: 'Campus communities for students.',
      what: 'My Campus brings students of the same school or university together: campus news, classmates and campus groups.',
      steps: [
        'Add My Campus to your app here.',
        'Sign students in with Wevsoft (openid, profile).',
        'Link them to /campus for their campus space.',
        'Use Groups (groups.read / groups.write) for class or club communities.',
      ],
      useCases: ['A university app that links to the campus community', 'Club or society management for students', 'Sharing campus notices and events'],
      gives: ['Signed-in students', 'An existing campus community to plug into', 'Campus groups through the Groups scopes'],
    },
    bn: {
      name: 'মাই ক্যাম্পাস',
      tagline: 'শিক্ষার্থীদের ক্যাম্পাস কমিউনিটি।',
      what: 'মাই ক্যাম্পাস একই স্কুল বা বিশ্ববিদ্যালয়ের শিক্ষার্থীদের এক জায়গায় আনে: ক্যাম্পাসের খবর, সহপাঠী আর ক্যাম্পাসের গ্রুপ।',
      steps: [
        'এখান থেকে আপনার অ্যাপে মাই ক্যাম্পাস যোগ করুন।',
        'Wevsoft সাইন-ইন (openid, profile) দিয়ে শিক্ষার্থীদের লগইন করান।',
        'তাঁদের ক্যাম্পাস পেজে যেতে /campus লিংক দিন।',
        'ক্লাস বা ক্লাবের কমিউনিটির জন্য গ্রুপ (groups.read / groups.write) ব্যবহার করুন।',
      ],
      useCases: ['বিশ্ববিদ্যালয়ের অ্যাপ থেকে ক্যাম্পাস কমিউনিটিতে যাওয়া', 'শিক্ষার্থীদের ক্লাব বা সংগঠন চালানো', 'ক্যাম্পাসের নোটিশ আর ইভেন্ট শেয়ার করা'],
      gives: ['সাইন-ইন করা শিক্ষার্থী', 'যুক্ত হওয়ার মতো তৈরি ক্যাম্পাস কমিউনিটি', 'গ্রুপ স্কোপ দিয়ে ক্যাম্পাসের গ্রুপ'],
    },
  },
  academic: {
    scopes: [],
    en: {
      name: 'Academic',
      tagline: 'Courses, lessons and teachers.',
      what: 'Academic is Wevsoft\'s learning space: teachers publish courses and lessons, and students follow them with discussions.',
      steps: [
        'Add Academic to your app here.',
        'Sign learners and teachers in with Wevsoft (openid, profile).',
        'Link teachers to /academic to create a course, and learners to a course to enrol.',
        'Use Events or Live if your classes also run as scheduled or live sessions.',
      ],
      useCases: ['A school app that hosts its courses on Wevsoft', 'A tutoring service that sends students to lessons', 'Coaching centres sharing recorded classes'],
      gives: ['Ready course and lesson pages', 'Signed-in teachers and learners', 'Lesson discussions without building your own'],
    },
    bn: {
      name: 'অ্যাকাডেমিক',
      tagline: 'কোর্স, লেসন আর শিক্ষক।',
      what: 'অ্যাকাডেমিক হলো Wevsoft-এর শেখার জায়গা। শিক্ষকেরা কোর্স ও লেসন প্রকাশ করেন, আর শিক্ষার্থীরা আলোচনা করতে করতে শেখেন।',
      steps: [
        'এখান থেকে আপনার অ্যাপে অ্যাকাডেমিক যোগ করুন।',
        'Wevsoft সাইন-ইন (openid, profile) দিয়ে শিক্ষক আর শিক্ষার্থীদের লগইন করান।',
        'কোর্স বানাতে শিক্ষকদের /academic-এ, আর ভর্তি হতে শিক্ষার্থীদের কোর্সের পেজে পাঠান।',
        'ক্লাস নির্দিষ্ট সময়ে বা লাইভে হলে ইভেন্ট বা লাইভ ব্যবহার করুন।',
      ],
      useCases: ['স্কুলের কোর্স Wevsoft-এ চালানো', 'টিউটরিং সার্ভিস থেকে শিক্ষার্থীদের লেসনে পাঠানো', 'কোচিং সেন্টারের রেকর্ড করা ক্লাস শেয়ার করা'],
      gives: ['তৈরি কোর্স আর লেসনের পেজ', 'সাইন-ইন করা শিক্ষক ও শিক্ষার্থী', 'নিজে না বানিয়েই লেসনভিত্তিক আলোচনা'],
    },
  },
  'ai-study': {
    scopes: [],
    en: {
      name: 'AI Study',
      tagline: 'AI tutor, notes and quizzes.',
      what: 'AI Study is a study assistant: an AI tutor, a problem solver, note-making, quizzes and a study planner.',
      steps: [
        'Add AI Study to your app here.',
        'Sign students in with Wevsoft (openid, profile).',
        'Link them to /study to open the AI study tools.',
        'Pair it with Academic so learners can revise what they studied in a course.',
      ],
      useCases: ['A "Study with AI" button in a learning app', 'Exam preparation with auto-made quizzes', 'Turning lecture notes into a study plan'],
      gives: ['AI tutoring your users can reach in one tap', 'Notes, quizzes and plans without building AI features yourself', 'Signed-in learners'],
    },
    bn: {
      name: 'এআই স্টাডি',
      tagline: 'এআই টিউটর, নোট আর কুইজ।',
      what: 'এআই স্টাডি হলো পড়াশোনার সহকারী: এআই টিউটর, প্রশ্নের সমাধান, নোট বানানো, কুইজ আর পড়ার পরিকল্পনা।',
      steps: [
        'এখান থেকে আপনার অ্যাপে এআই স্টাডি যোগ করুন।',
        'Wevsoft সাইন-ইন (openid, profile) দিয়ে শিক্ষার্থীদের লগইন করান।',
        'এআই স্টাডির টুল খুলতে তাঁদের /study লিংকে পাঠান।',
        'কোর্সে যা পড়েছেন তা ঝালিয়ে নিতে অ্যাকাডেমিকের সাথে মিলিয়ে ব্যবহার করুন।',
      ],
      useCases: ['শেখার অ্যাপে "এআই-এর সাথে পড়ুন" বাটন', 'নিজে থেকে তৈরি কুইজ দিয়ে পরীক্ষার প্রস্তুতি', 'লেকচারের নোট থেকে পড়ার পরিকল্পনা বানানো'],
      gives: ['এক ট্যাপে এআই টিউটর', 'নিজে এআই না বানিয়েই নোট, কুইজ আর পরিকল্পনা', 'সাইন-ইন করা শিক্ষার্থী'],
    },
  },
};
