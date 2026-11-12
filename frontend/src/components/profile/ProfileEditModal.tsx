import { useState, useEffect, useRef } from 'react';
import { X, User, Book, MapPin, Phone, Share2, Star, CheckCircle, AlertCircle, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import PrivacySelect from './PrivacySelect';

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'education', label: 'Education', icon: Book },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'social', label: 'Social Links', icon: Share2 },
  { id: 'skills', label: 'Skills & Hobbies', icon: Star },
];

export default function ProfileEditModal({ profile, onClose, onSave }: { profile: any, onClose: () => void, onSave: (data: any) => void }) {
  const [activeTab, setActiveTab] = useState('basic');
  const initialSocials = (() => {
    try {
      return profile.socialLinks && profile.socialLinks !== 'null' ? JSON.parse(profile.socialLinks) || {} : {};
    } catch {
      return {};
    }
  })();
  const [form, setForm] = useState<any>({ 
    ...profile, 
    social_facebook: initialSocials.facebook || '',
    social_instagram: initialSocials.instagram || '',
    social_linkedin: initialSocials.linkedin || '',
    social_github: initialSocials.github || '',
    social_x: initialSocials.x || '',
    social_youtube: initialSocials.youtube || '',
    website: initialSocials.website || '',
    hobbies: profile.interests || '', 
  });
  const initialPrivacy = (() => {
    try {
      return profile.privacySettings && profile.privacySettings !== 'null' ? JSON.parse(profile.privacySettings) || {} : {};
    } catch {
      return {};
    }
  })();
  const [privacySettings, setPrivacySettings] = useState<any>(initialPrivacy);
  
  const [usernameStatus, setUsernameStatus] = useState<{checking: boolean, available: boolean | null, suggestions: string[], message: string}>({
    checking: false, available: null, suggestions: [], message: ''
  });
  const [usernameMeta, setUsernameMeta] = useState<{ canChange: boolean; nextEligibleLabel: string | null }>({ canChange: true, nextEligibleLabel: null });
  const [usernameMenuOpen, setUsernameMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpPhotos, setHelpPhotos] = useState<File[]>([]);
  
  const checkTimeout = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/account/username', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setUsernameMeta({ canChange: !!data.canChange, nextEligibleLabel: data.nextEligibleLabel || null }))
      .catch(() => {});
  }, []);

  const checkUsername = async (username: string) => {
    if (!username || username === profile.username) {
      setUsernameStatus({ checking: false, available: null, suggestions: [], message: '' });
      return;
    }
    setUsernameStatus({ checking: true, available: null, suggestions: [], message: 'Checking...' });
    
    try {
      const res = await fetch(`/api/auth/check-username?username=${username}`);
      const data = await res.json();
      if (data.available) {
        setUsernameStatus({ checking: false, available: true, suggestions: [], message: 'Username Available' });
      } else {
        setUsernameStatus({ checking: false, available: false, suggestions: data.suggestions || [], message: 'Username Already Taken' });
      }
    } catch (e) {
      setUsernameStatus({ checking: false, available: null, suggestions: [], message: 'Error checking username' });
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    if (name === 'username') {
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
      checkTimeout.current = setTimeout(() => {
        checkUsername(value);
      }, 500);
    }
  };
  const handlePrivacyChange = (field: string, val: import('../../lib/postVisibility').VisibilityFlags) =>
    setPrivacySettings({ ...privacySettings, [field]: val });

  const handleSubmit = () => {
    if (usernameStatus.available === false) {
      toast.error('Please choose a valid and available username');
      return;
    }

    const socialLinks = JSON.stringify({
      facebook: form.social_facebook,
      instagram: form.social_instagram,
      linkedin: form.social_linkedin,
      github: form.social_github,
      x: form.social_x,
      youtube: form.social_youtube,
      website: form.website,
    });
    // Whitelist only editable fields — never round-trip avatar/cover/id/_count or the
    // whole profile object (that was overwriting newer photos with stale values).
    const payload: Record<string, unknown> = {
      name: form.name,
      username: form.username,
      bio: form.bio,
      gender: form.gender,
      dob: form.dob,
      pronouns: form.pronouns,
      intro: form.intro,
      work: form.work,
      designation: form.designation,
      bloodGroup: form.bloodGroup,
      relationshipStatus: form.relationshipStatus,
      location: form.location,
      district: form.district,
      hometown: form.hometown,
      country: form.country,
      schoolName: form.schoolName,
      sscYear: form.sscYear,
      collegeName: form.collegeName,
      hscYear: form.hscYear,
      hscBatch: form.hscBatch,
      department: form.department,
      rollNo: form.rollNo,
      universityName: form.universityName,
      uniDepartment: form.uniDepartment,
      gradYear: form.gradYear,
      whatsapp: form.whatsapp,
      academicEmail: form.academicEmail,
      email: form.email,
      phone: form.phone,
      mobile: form.mobile,
      skills: form.skills,
      skillsLevel: form.skillsLevel,
      interests: form.hobbies,
      socialLinks,
      privacySettings: JSON.stringify(privacySettings),
      profileFrame: form.profileFrame,
      profileTheme: form.profileTheme,
      profileColor: form.profileColor,
      profileLayout: form.profileLayout,
      profileLocked: form.profileLocked,
      translationLanguage: form.translationLanguage,
    };
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) delete payload[key];
    }
    onSave(payload);
  };

  const renderField = (name: string, label: string, type: string = "text", placeholder: string = "") => (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        <PrivacySelect value={privacySettings[name] || 'public'} onChange={(v) => handlePrivacyChange(name, v)} />
      </div>
      {type === "textarea" ? (
        <textarea
          name={name}
          value={form[name] || ''}
          onChange={handleChange}
          placeholder={placeholder}
          spellCheck={name !== 'bio'}
          className={`w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${name === 'bio' ? 'wev-profile-bio min-h-[6rem]' : ''}`}
          rows={name === 'bio' ? 5 : 3}
        />
      ) : type === "select" ? (
         <select name={name} value={form[name] || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm">
            {name === "gender" && <><option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></>}
            {name === "bloodGroup" && <><option value="">Select</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option></>}
            {name === "relationshipStatus" && <><option value="">Select</option><option value="Single">Single</option><option value="In a relationship">In a relationship</option><option value="Married">Married</option><option value="Complicated">It's complicated</option></>}
         </select>
      ) : (
        <input type={type} name={name} value={type === 'date' && form[name] ? new Date(form[name]).toISOString().split('T')[0] : (form[name] || '')} onChange={handleChange} placeholder={placeholder} className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-card w-full max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-border flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Profile"
      >
        
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center p-4 border-b border-border shrink-0">
           <h2 className="font-bold text-lg">Edit Profile</h2>
           <button onClick={onClose} className="p-2 hover:bg-muted rounded-full"><X size={20}/></button>
        </div>

        {/* Sidebar */}
        <div className="md:w-64 bg-muted/20 border-b md:border-r md:border-b-0 border-border p-3 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0">
          <div className="hidden md:flex justify-between items-center mb-4 px-2">
            <h2 className="font-bold text-lg">Edit Profile</h2>
          </div>
          {TABS.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap shrink-0 ${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <tab.icon size={18} /> <span className="inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {activeTab === 'basic' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderField('name', 'Full Name', 'text', 'Your Name')}
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-muted-foreground">Username</label>
                      <div className="flex items-center gap-2">
                        <PrivacySelect value={privacySettings['username'] || 'public'} onChange={(v) => handlePrivacyChange('username', v)} />
                        <button type="button" onClick={() => setUsernameMenuOpen((v) => !v)} className="p-1 rounded-lg hover:bg-muted">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                    <input type="text" name="username" value={form.username || ''} onChange={handleChange} placeholder="username" className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                    {!usernameMeta.canChange && usernameMeta.nextEligibleLabel && (
                      <p className="text-xs text-amber-600">You can change your username again on {usernameMeta.nextEligibleLabel}.</p>
                    )}
                    {usernameMenuOpen && !usernameMeta.canChange && (
                      <button type="button" onClick={() => { setUsernameMenuOpen(false); setHelpOpen(true); }} className="text-xs font-semibold text-primary">
                        ⋮ Request Username Change Help
                      </button>
                    )}
                    {helpOpen && (
                      <div className="rounded-xl border border-border p-3 space-y-2">
                        <textarea value={helpMessage} onChange={(e) => setHelpMessage(e.target.value)} placeholder="I need to change my username because..." className="w-full min-h-[80px] rounded-lg border border-border bg-background p-2 text-sm" />
                        <input type="file" accept="image/*" multiple onChange={(e) => setHelpPhotos(Array.from(e.target.files || []))} />
                        <button
                          type="button"
                          onClick={async () => {
                            const token = localStorage.getItem('token');
                            const body = new FormData();
                            body.append('requestedUsername', form.username || '');
                            body.append('message', helpMessage);
                            helpPhotos.forEach((file) => body.append('photos', file));
                            const res = await fetch('/api/account/username-help', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
                            const data = await res.json();
                            if (!res.ok) toast.error(data.error || 'Request failed');
                            else {
                              toast.success('Help request sent');
                              setHelpOpen(false);
                            }
                          }}
                          className="text-xs font-bold text-primary"
                        >
                          Send help request
                        </button>
                      </div>
                    )}
                    {usernameStatus.checking && <p className="text-xs text-blue-500">Checking username...</p>}
                    {usernameStatus.available === true && <p className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Username Available</p>}
                    {usernameStatus.available === false && (
                      <div className="text-xs text-red-500 space-y-1">
                        <p className="flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Username Already Taken</p>
                        {usernameStatus.suggestions.length > 0 && (
                          <p className="text-muted-foreground">Suggestions: {usernameStatus.suggestions.join(', ')}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {renderField('pronouns', 'Pronouns', 'text', 'they/them')}
                  {renderField('dob', 'Date of Birth', 'date')}
                  {renderField('gender', 'Gender', 'select')}
                  {renderField('bloodGroup', 'Blood Group (Optional)', 'select')}
                  {renderField('relationshipStatus', 'Relationship Status (Optional)', 'select')}
                </div>
                
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl">
                  <div>
                    <h4 className="font-bold text-red-600 dark:text-red-400">Profile Lock</h4>
                    <p className="text-sm text-red-500/80">Only friends can see your full profile.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="profileLocked" checked={form.profileLocked || false} onChange={(e) => setForm({...form, profileLocked: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
                  </label>
                </div>

                {renderField('intro', 'Intro', 'text', 'A short intro about you')}
                {renderField('bio', 'Bio', 'textarea', 'Write something about yourself...')}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Profile Photo</p>
                        <p className="text-[11px] text-muted-foreground/80">Who can see your avatar</p>
                      </div>
                      <PrivacySelect value={privacySettings['avatar'] || 'public'} onChange={(v) => handlePrivacyChange('avatar', v)} />
                    </div>
                  </div>
                  <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Cover Photo</p>
                        <p className="text-[11px] text-muted-foreground/80">Who can see your cover</p>
                      </div>
                      <PrivacySelect value={privacySettings['cover'] || 'public'} onChange={(v) => handlePrivacyChange('cover', v)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'education' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h3 className="font-bold border-b border-border pb-2 mb-4">Work & Career</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('work', 'Current Job / Workplace')}
                    {renderField('designation', 'Designation')}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold border-b border-border pb-2 mb-4">School</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('schoolName', 'School Name')}
                    {renderField('sscYear', 'SSC Year / Batch')}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold border-b border-border pb-2 mb-4">College</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('collegeName', 'College Name')}
                    {renderField('hscYear', 'HSC Year / Batch')}
                    {renderField('department', 'Department / Group')}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold border-b border-border pb-2 mb-4">University (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('universityName', 'University Name')}
                    {renderField('uniDepartment', 'Department')}
                    {renderField('gradYear', 'Graduation Year')}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'location' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('location', 'Current Location')}
                    {renderField('hometown', 'Hometown')}
                    {renderField('district', 'District')}
                    {renderField('country', 'Country')}
                 </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('mobile', 'Mobile Number', 'tel')}
                    {renderField('whatsapp', 'WhatsApp Number', 'tel')}
                    {renderField('email', 'Personal Email (Read-only)', 'email')}
                    {renderField('academicEmail', 'Academic Email', 'email')}
                 </div>
                 <p className="text-xs text-muted-foreground italic">* Email field here is for reference, main email must be changed in account settings.</p>
              </div>
            )}

            {activeTab === 'social' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <p className="text-sm text-muted-foreground mb-4">Enter your usernames or profile URLs. We will automatically generate the icons for your profile.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('social_facebook', 'Facebook', 'text', 'facebook.com/yourprofile')}
                    {renderField('social_instagram', 'Instagram', 'text', '@username')}
                    {renderField('social_linkedin', 'LinkedIn', 'text', 'linkedin.com/in/username')}
                    {renderField('social_github', 'GitHub', 'text', 'github.com/username')}
                    {renderField('social_x', 'X (Twitter)', 'text', '@username')}
                    {renderField('social_youtube', 'YouTube', 'text', 'youtube.com/@channel')}
                    {renderField('website', 'Personal Website', 'text', 'https://yourwebsite.com')}
                 </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div>
                   {renderField('hobbies', 'Hobbies & Interests', 'text', 'Programming, Photography, Gaming (Comma separated)')}
                 </div>
                 <div>
                   {renderField('skills', 'Professional Skills', 'text', 'Web Development, Graphic Design (Comma separated)')}
                 </div>
                 <div>
                   {renderField('achievements', 'Achievements / Badges', 'text', 'Verified Student, Wevsoft Member (Comma separated)')}
                 </div>
              </div>
            )}
          </div>

          <div className="p-4 md:p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
            <button onClick={onClose} className="px-5 py-2.5 font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={handleSubmit} disabled={usernameStatus.available === false} className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
