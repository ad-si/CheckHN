import React, { useState, useEffect } from 'react';

const HackerNewsTop100 = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readArticles, setReadArticles] = useState(new Set());
  const [viewMode, setViewMode] = useState('unread'); // 'unread' or 'read'

  useEffect(() => {
    // Load read articles from localStorage on component mount
    const savedReadArticles = localStorage.getItem('readArticles');
    if (savedReadArticles) {
      setReadArticles(new Set(JSON.parse(savedReadArticles)));
    }
    fetchTopPosts();
  }, []);

  const fetchTopPosts = async () => {
    try {
      setLoading(true);

      // Get read articles from localStorage
      const savedReadArticles = localStorage.getItem('readArticles');
      const currentReadArticles = savedReadArticles ? new Set(JSON.parse(savedReadArticles)) : new Set();
      const readCount = currentReadArticles.size;

      // Use Algolia HN Search API to get top stories of all time
      // Smart loading: only load enough pages to get 20 unread articles
      const allStories = [];
      const targetUnreadCount = 20;
      let unreadFound = 0;
      let page = 0;
      const maxPages = Math.max(2, Math.ceil((targetUnreadCount + readCount) / 20) + 1);

      while (unreadFound < targetUnreadCount && page < maxPages) {
        const response = await fetch(
          `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=20&page=${page}&numericFilters=points>100`
        );
        const data = await response.json();

        if (data.hits && data.hits.length > 0) {
          // Process and filter stories as we fetch them
          const pageStories = data.hits
            .filter(story => story.points && story.title)
            .map(story => ({
              id: story.objectID,
              title: story.title,
              url: story.url,
              score: story.points,
              by: story.author,
              time: story.created_at_i,
              descendants: story.num_comments
            }))
            .filter(story => !currentReadArticles.has(story.id));

          allStories.push(...pageStories);
          unreadFound += pageStories.length;
        } else {
          break;
        }

        page++;
      }

      // Sort by points (score) and take top 20 unread
      const topStories = allStories
        .sort((a, b) => b.score - a.score)
        .slice(0, targetUnreadCount);

      setPosts(topStories);
    } catch (err) {
      setError('Failed to fetch Hacker News posts. Please try again.');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadArticles = async () => {
    try {
      setLoading(true);

      // Get read article IDs from localStorage
      const savedReadArticles = localStorage.getItem('readArticles');
      const readArticleIds = savedReadArticles ? JSON.parse(savedReadArticles) : [];

      if (readArticleIds.length === 0) {
        setPosts([]);
        return;
      }

      // Fetch details for read articles from Algolia
      const readPosts = [];

      for (let page = 0; page < 20; page++) {
        const response = await fetch(
          `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=20&page=${page}&numericFilters=points>100`
        );
        const data = await response.json();

        if (data.hits && data.hits.length > 0) {
          const pageStories = data.hits
            .filter(story => story.points && story.title)
            .map(story => ({
              id: story.objectID,
              title: story.title,
              url: story.url,
              score: story.points,
              by: story.author,
              time: story.created_at_i,
              descendants: story.num_comments
            }))
            .filter(story => readArticleIds.includes(story.id));

          readPosts.push(...pageStories);

          // Stop if we've found all read articles
          if (readPosts.length >= readArticleIds.length) {
            break;
          }
        } else {
          break;
        }
      }

      // Sort by points (score)
      const sortedReadPosts = readPosts.sort((a, b) => b.score - a.score);
      setPosts(sortedReadPosts);

    } catch (err) {
      setError('Failed to fetch read articles. Please try again.');
      console.error('Error fetching read articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOff = (articleId) => {
    const newReadArticles = new Set([...readArticles, articleId]);
    setReadArticles(newReadArticles);

    // Save to localStorage
    localStorage.setItem('readArticles', JSON.stringify([...newReadArticles]));

    // Remove the article from current posts if viewing unread
    if (viewMode === 'unread') {
      setPosts(prevPosts => prevPosts.filter(post => post.id !== articleId));
    }
  };

  const handleUncheckArticle = (articleId) => {
    const newReadArticles = new Set([...readArticles]);
    newReadArticles.delete(articleId);
    setReadArticles(newReadArticles);

    // Save to localStorage
    localStorage.setItem('readArticles', JSON.stringify([...newReadArticles]));

    // Remove the article from current posts if viewing read articles
    if (viewMode === 'read') {
      setPosts(prevPosts => prevPosts.filter(post => post.id !== articleId));
    }
  };

  const switchToReadView = () => {
    setViewMode('read');
    fetchReadArticles();
  };

  const switchToUnreadView = () => {
    setViewMode('unread');
    fetchTopPosts();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-CA'); // YYYY-MM-DD format
  };

  const formatUrl = (url) => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 p-6">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              HN Check Off
            </h1>
            <p className="text-gray-600">
              {viewMode === 'unread'
                ? 'Your checklist for the all-time top Hacker News posts.'
                : `Articles you've already read (${readArticles.size} total).`
              }
            </p>
          </header>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading top Hacker News posts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-orange-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchTopPosts}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            HN Check Off
          </h1>
          <p className="text-gray-600">
            {viewMode === 'unread'
              ? 'Your checklist for the all-time top Hacker News posts.'
              : `Articles you've already read (${readArticles.size} total).`
            }
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {viewMode === 'unread' ? (
              <>
                <button
                  onClick={fetchTopPosts}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded transition-colors text-xs"
                >
                  Refresh
                </button>
                <button
                  onClick={switchToReadView}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors text-xs"
                >
                  View Read Articles
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={switchToUnreadView}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded transition-colors text-xs"
                >
                  Back to Unread
                </button>
                <button
                  onClick={fetchReadArticles}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors text-xs"
                >
                  Refresh
                </button>
              </>
            )}
          </div>
        </header>

        <div className="space-y-4">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewMode === 'read'}
                    onChange={() => viewMode === 'unread' ? handleCheckOff(post.id) : handleUncheckArticle(post.id)}
                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-lg font-bold text-orange-500 w-8 text-center">
                    #{index + 1}
                  </span>
                </div>

                <div className="flex-grow min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                    {post.url ? (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-600 transition-colors"
                      >
                        {post.title}
                      </a>
                    ) : (
                      <a
                        href={`https://news.ycombinator.com/item?id=${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-600 transition-colors"
                      >
                        {post.title}
                      </a>
                    )}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium text-orange-600">
                      {post.score} points
                    </span>
                    <span>by <a
                      href={`https://news.ycombinator.com/user?id=${post.by}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-600 transition-colors"
                    >
                      {post.by}
                    </a></span>
                    <span>{formatDate(post.time)}</span>
                    {post.descendants && (
                      <a
                        href={`https://news.ycombinator.com/item?id=${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-600 transition-colors"
                      >
                        {post.descendants} comments
                      </a>
                    )}
                    {post.url && (
                      <span className="text-gray-500 cursor-help" title={post.url}>
                        ({formatUrl(post.url)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {posts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {viewMode === 'unread'
                ? 'No unread posts found.'
                : 'No read articles yet. Start checking off articles to see them here!'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HackerNewsTop100;
