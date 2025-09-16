import React, { useState, useEffect } from 'react';

const HackerNewsTop100 = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTopPosts();
  }, []);

  const fetchTopPosts = async () => {
    try {
      setLoading(true);
      
      // First, get the top story IDs
      const topStoriesResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const topStoryIds = await topStoriesResponse.json();
      
      // Fetch details for the first 100 stories
      const storyPromises = topStoryIds.slice(0, 100).map(async (id) => {
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return response.json();
      });
      
      const stories = await Promise.all(storyPromises);
      
      // Filter out any null results and sort by score (upvotes)
      const validStories = stories
        .filter(story => story && story.score)
        .sort((a, b) => b.score - a.score);
      
      setPosts(validStories);
    } catch (err) {
      setError('Failed to fetch Hacker News posts. Please try again.');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
            Top 100 Hacker News Posts of All Time
          </h1>
          <p className="text-gray-600">
            Ranked by upvotes • {posts.length} posts loaded
          </p>
          <button 
            onClick={fetchTopPosts}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors text-sm"
          >
            Refresh
          </button>
        </header>

        <div className="space-y-4">
          {posts.map((post, index) => (
            <div 
              key={post.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 text-center">
                  <span className="text-lg font-bold text-orange-500">
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
                    <span>by {post.by}</span>
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
                      <span className="text-gray-500">
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
            <p className="text-gray-600">No posts found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HackerNewsTop100;