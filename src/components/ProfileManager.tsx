import React, { useState, useEffect } from 'react';
import { UserInputs, UserProfile } from '../types';
import { Users, FolderPlus, Trash2 } from 'lucide-react';

interface ProfileManagerProps {
  currentInputs: UserInputs;
  onLoadProfile: (inputs: UserInputs) => void;
  onNewProfile: () => void;
}

const STORAGE_KEY = 'pension_user_profiles';

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  currentInputs,
  onLoadProfile,
  onNewProfile,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProfiles(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveProfilesToStorage = (updated: UserProfile[]) => {
    setProfiles(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSaveCurrent = () => {
    const name =
      profileNameInput.trim() ||
      `${currentInputs.gender === 'male' ? '男' : '女'}_${currentInputs.birthYearMonth}`;
    const newProfile: UserProfile = {
      id: Date.now().toString(),
      name,
      updatedAt: new Date().toLocaleDateString('zh-CN'),
      inputs: { ...currentInputs, profileName: name },
    };
    const updated = [newProfile, ...profiles.filter((p) => p.name !== name)];
    saveProfilesToStorage(updated);
    setSelectedProfileId(newProfile.id);
    setProfileNameInput('');
  };

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    if (!id) {
      onNewProfile();
      return;
    }
    const target = profiles.find((p) => p.id === id);
    if (target) {
      onLoadProfile(target.inputs);
    }
  };

  const handleDeleteProfile = (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    saveProfilesToStorage(updated);
    if (selectedProfileId === id) {
      setSelectedProfileId('');
      onNewProfile();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-base">人员测算档案管理</h3>
        </div>
        <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
          已存 {profiles.length} 份档案
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 模式一：导入已有档案 */}
        <div>
          <label className="block text-sm text-slate-600 mb-1 font-medium">
            模式一：导入/选择已有人员档案
          </label>
          <div className="flex space-x-2">
            <select
              value={selectedProfileId}
              onChange={(e) => handleSelectProfile(e.target.value)}
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">+ 新建全新人员档案</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name} ({p.updatedAt})
                </option>
              ))}
            </select>
            {selectedProfileId && (
              <button
                type="button"
                onClick={() => handleDeleteProfile(selectedProfileId)}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200"
                title="删除当前选中的档案"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 保存当前数据为档案 */}
        <div>
          <label className="block text-sm text-slate-600 mb-1 font-medium">
            模式二：新建并保存当前测算档案
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="例如：张三 (北京)"
              value={profileNameInput}
              onChange={(e) => setProfileNameInput(e.target.value)}
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg p-2"
            />
            <button
              type="button"
              onClick={handleSaveCurrent}
              className="px-3.5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 flex items-center space-x-1"
            >
              <FolderPlus className="w-4 h-4" />
              <span>保存档案</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
