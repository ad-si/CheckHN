import React, { useState, useEffect } from 'react';

const HackerNewsTop100 = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readArticles, setReadArticles] = useState(new Set());
  const [savedArticles, setSavedArticles] = useState(new Set());
  const [viewMode, setViewMode] = useState('unread'); // 'unread', 'read', or 'saved'
  const [collapsingArticles, setCollapsingArticles] = useState(new Set());

  useEffect(() => {
    // Load read articles from localStorage on component mount
    const savedReadArticles = localStorage.getItem('readArticles');
    if (savedReadArticles) {
      setReadArticles(new Set(JSON.parse(savedReadArticles)));
    }
    // Load saved articles from localStorage
    const savedSavedArticles = localStorage.getItem('savedArticles');
    if (savedSavedArticles) {
      setSavedArticles(new Set(JSON.parse(savedSavedArticles)));
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

      // Get saved articles from localStorage
      const savedSavedArticles = localStorage.getItem('savedArticles');
      const currentSavedArticles = savedSavedArticles ? new Set(JSON.parse(savedSavedArticles)) : new Set();
      const savedCount = currentSavedArticles.size;

      // Use Algolia HN Search API to get top stories of all time
      // Smart loading: dynamically adjust page size based on read and saved articles
      const allStories = [];
      const targetUnreadCount = 20;
      let unreadFound = 0;
      let page = 0;
      const maxPages = 10; // Safety limit

      // Calculate optimal page size: if we have many read or saved articles, fetch larger pages
      const estimatedPageSize = Math.max(20, Math.min(1000, targetUnreadCount + readCount + savedCount + 10));

      while (unreadFound < targetUnreadCount && page < maxPages) {
        const response = await fetch(
          `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${estimatedPageSize}&page=${page}&numericFilters=points>100`
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
            .filter(story => !currentReadArticles.has(story.id) && !currentSavedArticles.has(story.id));

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
      const maxPages = 10; // Safety limit
      // Use larger page size since we might need to search through many articles
      const pageSize = Math.min(1000, Math.max(50, readArticleIds.length + 20));

      for (let page = 0; page < maxPages; page++) {
        const response = await fetch(
          `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${pageSize}&page=${page}&numericFilters=points>100`
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
    if (viewMode === 'unread') {
      // Start collapse animation
      setCollapsingArticles(prev => new Set([...prev, articleId]));

      // Wait for animation to complete, then remove
      setTimeout(() => {
        const newReadArticles = new Set([...readArticles, articleId]);
        setReadArticles(newReadArticles);

        // Save to localStorage
        localStorage.setItem('readArticles', JSON.stringify([...newReadArticles]));

        // Remove from posts and stop collapsing
        setPosts(prevPosts => prevPosts.filter(post => post.id !== articleId));
        setCollapsingArticles(prev => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      }, 300); // Match animation duration
    } else {
      // In read view, no animation needed
      const newReadArticles = new Set([...readArticles, articleId]);
      setReadArticles(newReadArticles);
      localStorage.setItem('readArticles', JSON.stringify([...newReadArticles]));
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

  const switchToSavedView = () => {
    setViewMode('saved');
    fetchSavedArticles();
  };

  const fetchSavedArticles = async () => {
    try {
      setLoading(true);

      // Get saved article IDs from localStorage
      const savedSavedArticles = localStorage.getItem('savedArticles');
      const savedArticleIds = savedSavedArticles ? JSON.parse(savedSavedArticles) : [];

      if (savedArticleIds.length === 0) {
        setPosts([]);
        return;
      }

      // Fetch details for saved articles from Algolia
      const savedPosts = [];
      const maxPages = 10; // Safety limit
      const pageSize = Math.min(1000, Math.max(50, savedArticleIds.length + 20));

      for (let page = 0; page < maxPages; page++) {
        const response = await fetch(
          `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${pageSize}&page=${page}&numericFilters=points>100`
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
            .filter(story => savedArticleIds.includes(story.id));

          savedPosts.push(...pageStories);

          // Stop if we've found all saved articles
          if (savedPosts.length >= savedArticleIds.length) {
            break;
          }
        } else {
          break;
        }
      }

      // Sort by points (score)
      const sortedSavedPosts = savedPosts.sort((a, b) => b.score - a.score);
      setPosts(sortedSavedPosts);

    } catch (err) {
      setError('Failed to fetch saved articles. Please try again.');
      console.error('Error fetching saved articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSaved = (articleId) => {
    const newSavedArticles = new Set([...savedArticles]);
    if (newSavedArticles.has(articleId)) {
      newSavedArticles.delete(articleId);
      // Remove from posts if in saved view
      if (viewMode === 'saved') {
        setPosts(prevPosts => prevPosts.filter(post => post.id !== articleId));
      }
    } else {
      newSavedArticles.add(articleId);
      // Remove from posts if in unread view
      if (viewMode === 'unread') {
        setPosts(prevPosts => prevPosts.filter(post => post.id !== articleId));
      }
    }
    setSavedArticles(newSavedArticles);
    localStorage.setItem('savedArticles', JSON.stringify([...newSavedArticles]));
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
      <div className="min-h-screen bg-orange-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              CheckHN
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              {viewMode === 'unread'
                ? 'Your checklist for the most popular Hacker News posts.'
                : viewMode === 'read'
                ? `Articles you've already read.`
                : `Articles you've saved to read later.`
              }
            </p>
            <div className="flex justify-center gap-1 border-b border-gray-300 dark:border-gray-700">
              <button
                onClick={switchToUnreadView}
                className={`px-6 py-2 font-medium transition-colors ${
                  viewMode === 'unread'
                    ? 'text-orange-600 dark:text-orange-500 border-b-2 border-orange-600 dark:border-orange-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Unread
              </button>
              <button
                onClick={switchToSavedView}
                className={`px-6 py-2 font-medium transition-colors ${
                  viewMode === 'saved'
                    ? 'text-orange-600 dark:text-orange-500 border-b-2 border-orange-600 dark:border-orange-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Saved {savedArticles.size > 0 && `(${savedArticles.size})`}
              </button>
              <button
                onClick={switchToReadView}
                className={`px-6 py-2 font-medium transition-colors ${
                  viewMode === 'read'
                    ? 'text-orange-600 dark:text-orange-500 border-b-2 border-orange-600 dark:border-orange-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Read {readArticles.size > 0 && `(${readArticles.size})`}
              </button>
            </div>
          </header>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-orange-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchTopPosts}
              className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-4 py-2 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            CheckHN
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            {viewMode === 'unread'
              ? 'Your checklist for the most popular Hacker News posts.'
              : viewMode === 'read'
              ? `Articles you've already read.`
              : `Articles you've saved to read later.`
            }
          </p>
          <div className="flex justify-center gap-1 border-b border-gray-300 dark:border-gray-700">
            <button
              onClick={switchToUnreadView}
              className={`px-6 py-2 font-medium transition-colors ${
                viewMode === 'unread'
                  ? 'text-orange-600 dark:text-orange-500 border-b-2 border-orange-600 dark:border-orange-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Unread
            </button>
            <button
              onClick={switchToSavedView}
              className={`px-6 py-2 font-medium transition-colors ${
                viewMode === 'saved'
                  ? 'text-orange-600 dark:text-orange-500 border-b-2 border-orange-600 dark:border-orange-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Saved {savedArticles.size > 0 && `(${savedArticles.size})`}
            </button>
            <button
              onClick={switchToReadView}
              className={`px-6 py-2 font-medium transition-colors ${
                viewMode === 'read'
                  ? 'text-orange-600 dark:text-orange-500 border-b-2 border-orange-600 dark:border-orange-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Read {readArticles.size > 0 && `(${readArticles.size})`}
            </button>
          </div>
        </header>

        <div className="space-y-4">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow overflow-hidden ${
                collapsingArticles.has(post.id) ? 'article-collapse' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={viewMode === 'read'}
                      onChange={() => viewMode === 'unread' ? handleCheckOff(post.id) : handleUncheckArticle(post.id)}
                      className="w-4 h-4 text-orange-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                    />
                    <span className="text-lg font-bold text-orange-500 w-8 text-center">
                      #{index + 1}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleSaved(post.id)}
                    className={`w-4 h-4 flex items-center justify-center transition-colors ${
                      savedArticles.has(post.id) ? 'text-orange-600 dark:text-orange-500' : 'text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-500'
                    }`}
                    title={savedArticles.has(post.id) ? 'Remove from saved' : 'Save for later'}
                  >
                    {savedArticles.has(post.id) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex-grow min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
                    {post.url ? (
                      <>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-orange-600 dark:hover:text-orange-500 transition-colors"
                        >
                          {post.title}
                        </a>
                        <a
                          href={`https://news.ycombinator.com/from?site=${formatUrl(post.url)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-2 hover:text-orange-600 dark:hover:text-orange-500 transition-colors"
                        >
                          ({formatUrl(post.url)})
                        </a>
                      </>
                    ) : (
                      <a
                        href={`https://news.ycombinator.com/item?id=${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-600 dark:hover:text-orange-500 transition-colors"
                      >
                        {post.title}
                      </a>
                    )}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{formatDate(post.time)}</span>
                    <a
                      href={`https://news.ycombinator.com/item?id=${post.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-600 transition-colors"
                    >
                      {post.score} points
                    </a>
                    {post.descendants && (
                      <a
                        href={`https://news.ycombinator.com/item?id=${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-600 dark:hover:text-orange-500 transition-colors"
                      >
                        {post.descendants} comments
                      </a>
                    )}
                    <span>by <a
                      href={`https://news.ycombinator.com/user?id=${post.by}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-600 dark:hover:text-orange-500 transition-colors"
                    >
                      {post.by}
                    </a></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {posts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {viewMode === 'unread'
                ? 'No unread posts found.'
                : viewMode === 'read'
                ? 'No read articles yet. Start checking off articles to see them here!'
                : 'No saved articles yet. Click the bookmark icon to save articles for later!'
              }
            </p>
          </div>
        )}

        {viewMode === 'unread' && (
          <div className="mt-6 text-center">
            <button
              onClick={fetchTopPosts}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-6 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh
            </button>
          </div>
        )}

        <footer className="mt-12 pt-8 border-t border-gray-300 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built by{' '}
            <a
              href="https://adriansieber.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-600 dark:hover:text-orange-500 transition-colors"
            >
              Adrian Sieber
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default HackerNewsTop100;
