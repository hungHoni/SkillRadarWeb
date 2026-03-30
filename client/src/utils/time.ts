export function formatDistanceToNow(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export function formatDuration(isoDate: string): string {
	const date = new Date(isoDate);
	const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
	if (hours < 1) return '<1h';
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

export function formatCount(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
	return String(n);
}
