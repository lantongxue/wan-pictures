import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tag as TagIcon,
  Plus,
  Trash2,
  Edit3,
  ArrowRightLeft,
  Search,
  RefreshCw,
  Check,
  Sparkles,
  Layers,
  Image as ImageIcon,
  X,
  AlertTriangle,
} from 'lucide-react';
import { TagItem, ImageItem } from '../../types';
import { adminApi } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Field,
  FieldSet,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '../../components/ui/field';

const TAG_COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#0EA5E9', // Sky
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#F97316', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
];

export const AdminTagsPage: React.FC = () => {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Create Tag Form
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [newTagDesc, setNewTagDesc] = useState('');

  // Edit Tag Modal
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);

  // Merge Tags Modal
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSourceTag, setMergeSourceTag] = useState('');
  const [mergeTargetTag, setMergeTargetTag] = useState('');

  // Notification feedback
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tagRes, imgRes] = await Promise.all([
        adminApi.getTags(),
        adminApi.getImages({ pageSize: 1000 }),
      ]);
      if (tagRes.success) setTags(tagRes.data);
      if (imgRes.success) setImages(imgRes.data.items);
    } catch (err: any) {
      showNotification(err.message || '加载标签失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const res = await adminApi.createTag({
        name: newTagName.trim(),
        color: newTagColor,
        description: newTagDesc.trim(),
      });
      if (res.success) {
        showNotification(`标签 #${newTagName.toUpperCase()} 创建成功`);
        setNewTagName('');
        setNewTagDesc('');
        loadData();
      } else {
        showNotification(res.message || '创建标签失败', 'error');
      }
    } catch (err: any) {
      showNotification(err.message || '创建失败', 'error');
    }
  };

  const handleSaveEditTag = async () => {
    if (!editingTag) return;
    try {
      await adminApi.updateTag(editingTag.id, {
        name: editingTag.name,
        color: editingTag.color,
        description: editingTag.description,
      });
      showNotification(`标签 #${editingTag.name} 已更新`);
      setEditingTag(null);
      loadData();
    } catch (err: any) {
      showNotification(err.message || '更新失败', 'error');
    }
  };

  const handleDeleteTag = async (tag: TagItem) => {
    if (
      !confirm(
        `确定要删除标签 #${tag.name} 吗？系统将自动从所有关联图片中移除该标签。`
      )
    )
      return;

    try {
      await adminApi.deleteTag(tag.id, tag.name);
      showNotification(`标签 #${tag.name} 已删除`);
      loadData();
    } catch (err: any) {
      showNotification(err.message || '删除失败', 'error');
    }
  };

  const handleMergeTags = async () => {
    if (!mergeSourceTag || !mergeTargetTag || mergeSourceTag === mergeTargetTag) {
      showNotification('请选择两个不同的标签进行合并', 'error');
      return;
    }

    try {
      const res = await adminApi.mergeTags(mergeSourceTag, mergeTargetTag);
      showNotification(res.message || `已将 #${mergeSourceTag} 合并至 #${mergeTargetTag}`);
      setIsMergeModalOpen(false);
      setMergeSourceTag('');
      setMergeTargetTag('');
      loadData();
    } catch (err: any) {
      showNotification(err.message || '合并失败', 'error');
    }
  };

  // Filter tags by search
  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
          >
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              标签分类体系与合并治理
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              {tags.length} 个标签
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            多维度属性打标、标签色彩自定义与全库同义标签合并治理工具
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsMergeModalOpen(true)}
            className="h-9 px-3.5 text-xs rounded-xl gap-1.5 cursor-pointer text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>标签合并工具</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Create Tag Form + Tags List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Tag Card */}
        <div className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card space-y-4 shadow-xs h-fit">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">创建新检索标签</h3>
              <p className="text-xs text-muted-foreground">Add Custom Taxonomy Tag</p>
            </div>
          </div>

          <form onSubmit={handleCreateTag} className="pt-1">
            <FieldSet className="gap-4">
              <FieldGroup className="gap-3.5">
                <Field>
                  <FieldLabel htmlFor="create-tag-name" required>标签名称</FieldLabel>
                  <Input
                    id="create-tag-name"
                    type="text"
                    required
                    placeholder="例如: 4K / WALLPAPER / 插画"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="text-xs h-9 rounded-xl font-mono uppercase"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="create-tag-desc">描述说明 (选填)</FieldLabel>
                  <Input
                    id="create-tag-desc"
                    type="text"
                    placeholder="简要说明此标签的归类语义"
                    value={newTagDesc}
                    onChange={(e) => setNewTagDesc(e.target.value)}
                    className="text-xs h-9 rounded-xl"
                  />
                </Field>

                <Field>
                  <FieldLabel>标签视觉色标</FieldLabel>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {TAG_COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          newTagColor === color ? 'ring-2 ring-foreground scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {newTagColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </Field>
              </FieldGroup>

              <Button
                type="submit"
                className="w-full h-9 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer shadow-xs mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>保存并添加到标签库</span>
              </Button>
            </FieldSet>
          </form>
        </div>

        {/* Right Column: Tags Library & Search */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="检索标签名称或语义说明..."
                className="pl-9 text-xs h-9 rounded-xl"
              />
              {tagSearch && (
                <button
                  onClick={() => setTagSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Badge variant="subtle" className="text-[11px] font-mono shrink-0">
              共 {filteredTags.length} 个
            </Badge>
          </div>

          {/* Tags Grid */}
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">正在加载标签库...</p>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border/80 rounded-3xl bg-muted/10 space-y-2">
              <TagIcon className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground">未找到匹配的分类标签</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredTags.map((tag) => {
                // Calculate count of images that have this tag
                const count = images.filter((img) =>
                  img.tags?.some((t) => t.toUpperCase() === tag.name.toUpperCase())
                ).length;

                return (
                  <motion.div
                    key={tag.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: tag.color || '#3B82F6' }}
                        />
                        <span className="font-mono font-black text-sm text-foreground tracking-tight">
                          #{tag.name}
                        </span>
                      </div>

                      <Badge variant="subtle" className="text-[10px] font-mono">
                        {count} 张关联
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tag.description || '自定义属性标签，用于多维度聚合筛选。'}
                    </p>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTag(tag)}
                        className="h-7 px-2 text-xs rounded-lg gap-1 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>编辑</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTag(tag)}
                        className="h-7 px-2 text-xs rounded-lg gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>删除</span>
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. EDIT TAG MODAL */}
      {/* ========================================================= */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Edit3 className="w-4 h-4 text-primary" />
              <span>编辑标签属性</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改标签名称、色彩标识与详细说明
            </DialogDescription>
          </DialogHeader>

          {editingTag && (
            <div className="py-2">
              <FieldSet className="gap-4">
                <FieldGroup className="gap-3.5">
                  <Field>
                    <FieldLabel htmlFor="edit-tag-name" required>标签名称</FieldLabel>
                    <Input
                      id="edit-tag-name"
                      type="text"
                      value={editingTag.name}
                      onChange={(e) =>
                        setEditingTag({ ...editingTag, name: e.target.value.toUpperCase() })
                      }
                      className="text-xs h-9 rounded-xl font-mono uppercase"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-tag-desc">描述说明</FieldLabel>
                    <Input
                      id="edit-tag-desc"
                      type="text"
                      value={editingTag.description || ''}
                      onChange={(e) =>
                        setEditingTag({ ...editingTag, description: e.target.value })
                      }
                      className="text-xs h-9 rounded-xl"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>主题色标</FieldLabel>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {TAG_COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditingTag({ ...editingTag, color })}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            editingTag.color === color ? 'ring-2 ring-foreground scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {editingTag.color === color && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTag(null)}
              className="text-xs rounded-xl"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEditTag}
              className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              保存更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 2. MERGE TAGS TOOL MODAL */}
      {/* ========================================================= */}
      <Dialog open={isMergeModalOpen} onOpenChange={setIsMergeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <ArrowRightLeft className="w-4 h-4 text-amber-500" />
              <span>标签合并与归一化工具</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              将某个旧标签（源标签）全量替换并合并至另一个标准标签（目标标签）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                合并完成后，所有包含源标签的图片将自动变更为目标标签，源标签将被永久移除。
              </span>
            </div>

            <FieldSet className="gap-4">
              <FieldGroup className="gap-3.5">
                <Field>
                  <FieldLabel htmlFor="merge-source-tag" required>
                    选择源标签 (将被合并并删除)
                  </FieldLabel>
                  <Select value={mergeSourceTag} onValueChange={setMergeSourceTag}>
                    <SelectTrigger id="merge-source-tag" className="w-full text-xs h-9 rounded-xl font-mono uppercase">
                      <SelectValue placeholder="选择源标签" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          #{t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="merge-target-tag" required>
                    选择目标标签 (接收合并的主标签)
                  </FieldLabel>
                  <Select value={mergeTargetTag} onValueChange={setMergeTargetTag}>
                    <SelectTrigger id="merge-target-tag" className="w-full text-xs h-9 rounded-xl font-mono uppercase">
                      <SelectValue placeholder="选择目标标签" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags
                        .filter((t) => t.name !== mergeSourceTag)
                        .map((t) => (
                          <SelectItem key={t.id} value={t.name}>
                            #{t.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMergeModalOpen(false)}
              className="text-xs rounded-xl"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleMergeTags}
              className="text-xs rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold cursor-pointer"
            >
              确认合并标签
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
