"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Download, Play, Image as ImageIcon, FileVideo,
    Tag as TagIcon, ChevronLeft, ChevronRight, Calendar, Info, Trash2
} from "lucide-react";
import styles from "./page.module.css";
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Button, Snackbar, Alert, ThemeProvider, createTheme, CssBaseline
} from "@mui/material";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Dark Theme for MUI
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#ef4444' },
        secondary: { main: '#22c55e' },
        background: {
            default: '#0f172a',
            paper: '#1e293b',
        },
        text: { primary: '#f8fafc', secondary: '#94a3b8' }
    },
    typography: { fontFamily: 'inherit' },
    components: {
        MuiDialog: { styleOverrides: { paper: { backgroundImage: 'none' } } }
    }
});

// HERO CAROUSEL COMPONENT
function HeroCarousel({ items, onImageClick }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Auto-play logic
    useEffect(() => {
        if (!items || items.length === 0) return;
        if (isPaused) return;

        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % items.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [items, isPaused]);

    if (!items || items.length === 0) return null;

    const handleNext = () => {
        setActiveIndex((prev) => (prev + 1) % items.length);
    };

    const handlePrev = () => {
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    // Helper to get circular distance
    function getStyle(index) {
        const length = items.length;
        // Calculate distance from active index
        let offset = (index - activeIndex + length) % length;

        // Adjust for shortest path logic (e.g. 7 should be -1 if length is 8)
        if (offset > length / 2) {
            offset -= length;
        }

        // Determine visibility
        const isVisible = Math.abs(offset) <= 2; // Show active + 2 neighbors on each side
        const isActive = offset === 0;

        // Calculate styles
        const translateX = offset * 340; // 320px width + 20px overlap/gap
        const scale = isActive ? 1.3 : 0.9;
        const zIndex = 20 - Math.abs(offset);
        const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(offset) * 0.3);
        const blur = isActive ? 0 : 2;

        return {
            transform: `translateX(${translateX}px) scale(${scale})`,
            zIndex: zIndex,
            opacity: isVisible ? opacity : 0,
            pointerEvents: isVisible ? 'auto' : 'none',
            filter: `blur(${blur}px) grayscale(${isActive ? 0 : 30}%)`,
            // Add explicit transition to ensure smooth movement for all props
            transition: 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
        };
    }

    return (
        <div
            className={styles.heroSection}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className={styles.heroHeader}>
                <div style={{ background: 'var(--basarnas-red)', width: '4px', height: '24px', borderRadius: '2px' }}></div>
                <h2 className={styles.heroTitle}>Featured Highlights</h2>
            </div>

            <div className={styles.heroContainer}>
                <div className={styles.heroTrack}>
                    {items.map((item, index) => {
                        const style = getStyle(index);
                        const isActive = index === activeIndex;

                        return (
                            <div
                                key={item.id}
                                className={styles.heroCard} // Base class
                                style={style} // Dynamic inline styles
                                onClick={() => isActive ? onImageClick(item) : setActiveIndex(index)}
                            >
                                <img
                                    src={item.preview_s3_url}
                                    alt={item.original_name}
                                    className={styles.heroImage}
                                />

                                {/* Metadata Overlay for Active Card */}
                                <div className={styles.heroOverlay} style={{ opacity: isActive ? 1 : 0 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.3rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                        {item.original_name}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.9, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <Calendar size={14} />
                                        {new Date(item.media_date).toLocaleDateString()}
                                    </div>
                                </div>

                                {item.file_type === 'video' && (
                                    <div style={{
                                        position: 'absolute', top: '1rem', right: '1rem',
                                        background: 'rgba(0,0,0,0.6)', padding: '0.5rem', borderRadius: '8px',
                                        color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem',
                                        fontSize: '0.8rem'
                                    }}>
                                        <Play size={12} fill="white" /> Video
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Indicators */}
            <div className={styles.heroNav}>
                <div className={styles.heroIndicators} style={{ display: 'flex', gap: '0.5rem' }}>
                    {items.map((_, idx) => (
                        <div
                            key={idx}
                            className={`${styles.heroDot} ${idx === activeIndex ? styles.active : ''}`}
                            onClick={() => setActiveIndex(idx)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// TAG LIST COMPONENT
function TagList({ title, items, onImageClick, onDownload, onDropMedia, isAdmin }) {
    const scrollRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 400; // Scroll by approx one card + gap
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    function handleDragOver(e) {
        if (!isAdmin) return;
        e.preventDefault();
        setIsDragOver(true);
    }

    function handleDragLeave(e) {
        if (!isAdmin) return;
        e.preventDefault();
        setIsDragOver(false);
    }

    function handleDrop(e) {
        if (!isAdmin) return;
        e.preventDefault();
        setIsDragOver(false);
        const mediaId = e.dataTransfer.getData("mediaId");
        if (mediaId && onDropMedia) {
            onDropMedia(mediaId, title);
        }
    }

    if (!items || items.length === 0) return null;

    return (
        <div>
            <div
                className={styles.tagHeader}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    transition: 'all 0.2s',
                    backgroundColor: isDragOver ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                    border: isDragOver ? '2px dashed #22c55e' : '2px solid transparent',
                    borderRadius: '8px',
                    padding: '0.5rem'
                }}
            >
                <div className={styles.tagTitle}>
                    <TagIcon size={20} color="var(--basarnas-green)" />
                    {title}
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                        ({items.length})
                    </span>
                    {isAdmin && isDragOver && (
                        <span style={{ fontSize: '0.8rem', color: '#22c55e', marginLeft: '1rem' }}>
                            Drop to add tag
                        </span>
                    )}
                </div>
            </div>

            <div style={{ position: 'relative' }}>
                <button
                    className={`${styles.carouselBtn} ${styles.carouselBtnLeft}`}
                    onClick={() => scroll('left')}
                    aria-label="Scroll left"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className={styles.cardRow} ref={scrollRef}>
                    {items.map((media) => (
                        <div
                            key={media.id}
                            className={styles.detailCard}
                            draggable={isAdmin}
                            onDragStart={(e) => {
                                if (isAdmin) {
                                    e.dataTransfer.setData("mediaId", media.id);
                                    e.dataTransfer.effectAllowed = "copy";
                                }
                            }}
                            style={{ cursor: isAdmin ? 'grab' : 'default' }}
                        >
                            <div
                                className={styles.detailImageWrapper}
                                onClick={() => onImageClick(media)}
                            >
                                <img
                                    src={media.preview_s3_url}
                                    alt={media.original_name}
                                    className={styles.detailImage}
                                />
                                {media.file_type === 'video' && (
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                        background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '0.8rem', color: 'white'
                                    }}>
                                        <Play size={24} fill="white" />
                                    </div>
                                )}
                            </div>

                            <div className={styles.cardInfo}>
                                <div className={styles.cardTitle} title={media.original_name}>
                                    {media.original_name}
                                </div>
                                <div className={styles.cardMeta}>
                                    <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                        <Calendar size={12} />
                                        {new Date(media.media_date).toLocaleDateString()}
                                    </span>
                                    <button
                                        className={styles.iconBtn}
                                        onClick={() => onDownload(media)}
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    className={`${styles.carouselBtn} ${styles.carouselBtnRight}`}
                    onClick={() => scroll('right')}
                    aria-label="Scroll right"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
}

export default function MediaViewPage() {
    const params = useParams();
    const router = useRouter();
    const { year, month } = params;

    const [featuredMedia, setFeaturedMedia] = useState([]);
    const [groupedMedia, setGroupedMedia] = useState({});
    const [loading, setLoading] = useState(true);
    const [lightboxItem, setLightboxItem] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // MUI State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [mediaToDelete, setMediaToDelete] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('admin_token')) {
            setIsAdmin(true);
        }
        if (year && month) {
            fetchMedia();
        }
    }, [year, month]);

    // Handle Drop Event to Update Tags
    async function handleTagDrop(mediaId, targetTag) {
        // Find the media item locally first
        let mediaItem = featuredMedia.find(m => m.id === mediaId) ||
            Object.values(groupedMedia).flat().find(m => m.id === mediaId);

        if (!mediaItem) return;

        // Determine new tags
        let newTags = mediaItem.tags ? [...mediaItem.tags] : [];

        if (targetTag === 'Untagged') {
            newTags = []; // Clear tags if dropped on Untagged
        } else {
            if (!newTags.includes(targetTag)) {
                newTags.push(targetTag);
            } else {
                setSnackbar({ open: true, message: `Already tagged as ${targetTag}`, severity: "info" });
                return;
            }
        }

        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_BASE_URL}/api/media/${mediaId}/tags`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tags: newTags })
            });

            const data = await response.json();

            if (data.success) {
                setSnackbar({ open: true, message: `Tag updated to ${targetTag}`, severity: "success" });
                // Refresh data to reflect changes (easier than efficient local state update for complex grouping)
                fetchMedia();
            } else {
                setSnackbar({ open: true, message: `Update failed: ${data.error}`, severity: "error" });
            }
        } catch (error) {
            console.error(error);
            setSnackbar({ open: true, message: "Error updating tags", severity: "error" });
        }
    }

    // Open Delete Dialog
    function confirmDelete(media) {
        setMediaToDelete(media);
        setDeleteDialogOpen(true);
    }

    async function handleDeleteConfirmed() {
        if (!mediaToDelete) return;

        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_BASE_URL}/api/media/${mediaToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Remove from local state
                setFeaturedMedia(prev => prev.filter(m => m.id !== mediaToDelete.id));

                // Remove from grouped
                const newGrouped = { ...groupedMedia };
                Object.keys(newGrouped).forEach(key => {
                    newGrouped[key] = newGrouped[key].filter(m => m.id !== mediaToDelete.id);
                    if (newGrouped[key].length === 0) delete newGrouped[key];
                });
                setGroupedMedia(newGrouped);

                setLightboxItem(null);
                setSnackbar({ open: true, message: 'Media deleted successfully', severity: 'success' });
            } else {
                const data = await response.json();
                setSnackbar({ open: true, message: `Delete failed: ${data.error}`, severity: 'error' });
            }
        } catch (error) {
            console.error("Delete error:", error);
            setSnackbar({ open: true, message: 'Error deleting media', severity: 'error' });
        } finally {
            setDeleteDialogOpen(false);
            setMediaToDelete(null);
        }
    }

    async function fetchMedia() {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/media/${year}/${month}`);
            const data = await response.json();

            if (data.success) {
                const allMedia = data.media.sort((a, b) =>
                    new Date(b.media_date) - new Date(a.media_date)
                );

                const featured = allMedia.slice(0, 5);
                const others = allMedia.slice(5);

                const grouped = {};
                const untagged = [];

                others.forEach(item => {
                    if (!item.tags || item.tags.length === 0) {
                        untagged.push(item);
                    } else {
                        item.tags.forEach(tag => {
                            if (!grouped[tag]) grouped[tag] = [];
                            grouped[tag].push(item);
                        });
                    }
                });

                if (untagged.length > 0) {
                    grouped['Untagged'] = untagged;
                }

                setFeaturedMedia(featured);
                setGroupedMedia(grouped);
            }
        } catch (error) {
            console.error("Error fetching media:", error);
        } finally {
            setLoading(false);
        }
    }

    function handleDownload(media) {
        const url = media.download_s3_url || media.original_s3_url;
        window.location.href = url;
    }

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div className={styles.mediaPage}>
                <header className={styles.header}>
                    <button className={styles.backButton} onClick={() => router.push('/')}>
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <div className={styles.pageTitle}>
                        <div className={styles.logo}></div>
                        <div className={styles.breadcrumb}>{year} / {MONTH_NAMES[parseInt(month) - 1]}</div>
                    </div>
                </header>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        Loading gallery...
                    </div>
                ) : (
                    <>
                        <HeroCarousel
                            items={featuredMedia}
                            onImageClick={setLightboxItem}
                        />

                        <div className={styles.tagSections}>
                            {Object.keys(groupedMedia).sort().map(tag => (
                                <TagList
                                    key={tag}
                                    title={tag}
                                    items={groupedMedia[tag]}
                                    onImageClick={setLightboxItem}
                                    onDownload={handleDownload}
                                    onDropMedia={handleTagDrop}
                                    isAdmin={isAdmin}
                                />
                            ))}

                            {Object.keys(groupedMedia).length === 0 && featuredMedia.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '4rem' }}>No media found.</div>
                            )}
                        </div>
                    </>
                )}

                {/* Lightbox Modal */}
                {lightboxItem && (
                    <div className={styles.lightbox} onClick={() => setLightboxItem(null)}>
                        <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.lightboxMedia}>
                                {lightboxItem.file_type === 'video' ? (
                                    <div style={{ color: 'white', textAlign: 'center' }}>
                                        <Play size={64} style={{ marginBottom: '1rem', opacity: 0.8 }} />
                                        <p>Video Preview</p>
                                    </div>
                                ) : (
                                    <img
                                        src={lightboxItem.original_s3_url}
                                        alt={lightboxItem.original_name}
                                        className={styles.lightboxImg}
                                    />
                                )}
                            </div>
                            <div className={styles.lightboxInfo}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem', wordBreak: 'break-all' }}>
                                    {lightboxItem.original_name}
                                </h2>

                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.8rem 1.5rem',
                                    marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)'
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> Date</span>
                                    <span style={{ color: 'var(--text-primary)' }}>{new Date(lightboxItem.media_date).toLocaleDateString()}</span>

                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} /> Size</span>
                                    <span style={{ color: 'var(--text-primary)' }}>
                                        {(parseInt(lightboxItem.original_file_size || 0) / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>

                                <div style={{ marginBottom: '2rem', flexGrow: 1 }}>
                                    <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Description</h3>
                                    <p style={{ lineHeight: 1.6, fontSize: '0.95rem', color: lightboxItem.description ? 'var(--text-primary)' : 'var(--text-secondary)', fontStyle: lightboxItem.description ? 'normal' : 'italic' }}>
                                        {lightboxItem.description || "No description provided."}
                                    </p>
                                </div>

                                {lightboxItem.tags && lightboxItem.tags.length > 0 && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tags</h3>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {lightboxItem.tags.map(tag => (
                                                <span key={tag} style={{ background: 'var(--bg-tertiary)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => handleDownload(lightboxItem)}
                                    style={{
                                        width: '100%', background: 'var(--basarnas-red)', color: 'white', padding: '1rem',
                                        borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        marginTop: 'auto', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                    }}
                                >
                                    <Download size={20} /> Download Original
                                </button>

                                {isAdmin && (
                                    <button
                                        onClick={() => confirmDelete(lightboxItem)}
                                        style={{
                                            width: '100%',
                                            background: 'transparent',
                                            color: '#ef4444',
                                            padding: '0.8rem',
                                            marginTop: '1rem',
                                            border: '1px solid #ef4444',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            transition: 'all 0.2s',
                                            opacity: 0.8
                                        }}
                                        title="Delete this media permanently"
                                    >
                                        <Trash2 size={20} /> Delete Media
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MUI Delete Confirmation Dialog */}
                <Dialog
                    open={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    sx={{ zIndex: 2100 }}
                >
                    <DialogTitle style={{ color: '#ef4444' }}>Delete Media?</DialogTitle>
                    <DialogContent>
                        <DialogContentText style={{ color: '#cbd5e1' }}>
                            Are you sure you want to permanently delete "{mediaToDelete?.original_name}"?
                            This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Cancel</Button>
                        <Button onClick={handleDeleteConfirmed} variant="contained" color="error" autoFocus>
                            Delete Forever
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* MUI Snackbar for Notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        severity={snackbar.severity}
                        variant="filled"
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </div>
        </ThemeProvider>
    );
}
