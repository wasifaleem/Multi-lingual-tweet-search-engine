var Search = React.createClass({
    getInitialState: function () {
        return {jqXHR: null, response: {}, query: "", filter: [], currentCursor: 1, cursors: {1: "*"}};
    },
    handleQuery: function (event) {
        if (event.type === 'submit') {
            event.preventDefault();
        } else {
            var oldQuery = this.state.query;
            var newQuery = event.target.value;
            this.setState({query: newQuery}, function () {
                this.setState({currentCursor: 1, cursors: {1: "*"}});
                this.fetchResults(oldQuery);
            });
        }
    },
    buildQuery: function () {
        return JSON.stringify({
            query: this.state.query,
            filter: this.state.filter,
            facet: {
                hashtag: {terms: 'tweet_hashtags'},
                lang: {terms: 'lang'}
            }
        });
    },
    buildURL: function () {
        return 'http://localhost:8983/solr/tweets/query?hl=true' +
            '&hl.fragsize=0&hl.simple.pre=<b>&rows=10&hl.simple.post=</b>' +
            '&cursorMark=' + this.state.cursors[this.state.currentCursor] + '&sort=score desc, id asc';
    },
    fetchResults: function (oldQuery) {
        console.log(this.state.query);
        //if (newQuery != null && newQuery.length > 3) {
        if (this.state.query != null) {
            if (this.state.jqXHR && this.state.jqXHR.readyState !== 4) {
                this.state.jqXHR.abort();
            }
            this.setState({
                jqXHR: $.ajax({
                    url: this.buildURL(),
                    type: 'POST',
                    contentType: "application/json; charset=utf-8",
                    data: this.buildQuery(),
                    success: function (response) {
                        console.log(response);
                        this.updateStateOnResponse(response);
                        jQuery('html,body').animate({scrollTop: 0}, 0);
                    }.bind(this),
                    error: function (xhr, status, err) {
                        console.error(xhr.responseText);
                    }.bind(this)
                })
            });
        } else {
            this.setState({response: {}});
        }
    },
    updateStateOnResponse: function (response) {
        if (response.nextCursorMark
            && response.nextCursorMark !== "*"
            && response.nextCursorMark !== this.state.cursors[this.state.currentCursor]
            && response.hasOwnProperty('response')
            && response.response.docs
            && response.response.docs.length === 10) {
            this.state.cursors[this.state.currentCursor + 1] = response.nextCursorMark;
        }
        this.setState({response: response});
    },
    addFilter: function (filterValue) {
        if (jQuery.inArray(filterValue, this.state.filter) !== -1) {
            this.state.filter.pop(filterValue);
        } else {
            this.state.filter.push(filterValue);
        }
        this.fetchResults();
    },
    handlePager: function (e) {
        var cursors = this.state.cursors;
        var currentCursor = this.state.currentCursor;
        var cursorsLength = Object.keys(cursors).length;
        switch (e.target.textContent) {
            case "Next":
                if ((currentCursor + 1) <= cursorsLength) {
                    this.setState({currentCursor: (currentCursor + 1)}, function () {
                        this.fetchResults();
                    });
                }
                break;
            case "Prev":
                if ((currentCursor - 1) >= 1) {
                    this.setState({currentCursor: (currentCursor - 1)}, function () {
                        this.fetchResults();
                    });
                }
                break
        }
    },
    render: function () {
        return (
            <div>
                <nav className="navbar navbar-dark navbar-fixed-top bg-inverse">
                    <div id="navbar">
                        <form className="pull-xs-right">
                            <input autoFocus className="form-control" type="text"
                                   value={this.state.query} onChange={this.handleQuery}
                                   placeholder="Search..."/>
                        </form>
                    </div>
                </nav>
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-2 sidebar">
                            <Search.LangFacet onClick={this.addFilter} response={this.state.response}/>
                            <Search.LangFacet response={this.state.response}/>
                        </div>
                        <div className="col-md-8 col-md-offset-2 main">
                            <Search.ResultList response={this.state.response}/>
                            <Search.ResultPager onClick={this.handlePager} currentCursor={this.state.currentCursor}
                                                cursors={this.state.cursors}/>
                        </div>
                        <div className="col-md-2 col-md-offset-10 sidebar">
                            <Search.HashTagFacet onClick={this.addFilter} response={this.state.response}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

Search.ResultList = React.createClass({
    render: function () {
        var query = this.props.query;
        var response = this.props.response;
        if (response.hasOwnProperty('response') && response.response.docs && response.response.docs.length > 0) {
            var tweets = response.response.docs;
            var resultNodes = tweets.map(function (tweet) {
                return (
                    <div key={tweet.id}>
                        <Search.Tweet key={tweet.id} tweet={tweet} query={query} response={response}/>
                        <hr />
                    </div>
                );
            });
            return (
                <div>
                    {resultNodes}
                </div>
            );
        }
        return (
            null
        );
    }
});

Search.ResultPager = React.createClass({
    render: function () {
        var currentCursor = this.props.currentCursor;
        var cursors = this.props.cursors;
        var cursorsLength = Object.keys(cursors).length;
        if (cursorsLength >= 1) {
            var isPrevious = (currentCursor - 1) >= 1;
            var isNext = (currentCursor + 1) <= cursorsLength;
            return (
                <nav>
                    <ul className="pager">
                        {isPrevious ? <li className="pager-prev"><a onClick={this.props.onClick}>Prev</a></li> : null}
                        {isNext ? <li className="pager-next"><a onClick={this.props.onClick}>Next</a></li> : null}
                    </ul>
                </nav>
            );
        }
        return (
            null
        );
    }
});

Search.LangFacet = React.createClass({
    handleClick: function (e) {
        jQuery(e.target).toggleClass('active');
        this.props.onClick('lang:' + e.target.firstChild.textContent)
    },
    render: function () {
        var divStyle = {
            float: 'right'
        };
        var response = this.props.response;
        if (response.hasOwnProperty('facets') && response.facets.lang && response.facets.lang.buckets.length > 0) {
            var langs = response.facets.lang.buckets;
            var resultNodes = langs.map(function (lang) {
                return (
                    <li key={lang.val} className="nav-item">
                        <a className="nav-link" onClick={this.handleClick}>{lang.val}
                            <span className="label label-info label-pill" style={divStyle}>{lang.count}</span>
                        </a>
                    </li>
                );
            }, this);
            return (
                <div className="sidebar-block">
                    <h6>Lang:</h6>
                    <ul className="nav nav-pills nav-stacked">
                        {resultNodes}
                    </ul>
                </div>
            );
        }
        return (
            null
        );
    }
});

Search.HashTagFacet = React.createClass({
    handleClick: function (e) {
        jQuery(e.target).toggleClass('active');
        this.props.onClick('tweet_hashtags:' + e.target.firstChild.textContent.replace('#', ''))
    },
    render: function () {
        var divStyle = {
            float: 'right'
        };
        var response = this.props.response;
        if (response.hasOwnProperty('facets') && response.facets.hashtag && response.facets.hashtag.buckets.length > 0) {
            var hashtags = response.facets.hashtag.buckets;
            var resultNodes = hashtags.map(function (hashtag) {
                return (
                    <li key={hashtag.val} className="nav-item">
                        <a className="nav-link" onClick={this.handleClick}>{'#' + hashtag.val}
                            <span className="label label-info label-pill" style={divStyle}>{hashtag.count}</span>
                        </a>
                    </li>
                );
            }, this);
            return (
                <div className="sidebar-block">
                    <h6>Related Hashtags:</h6>
                    <ul className="nav nav-pills nav-stacked">
                        {resultNodes}
                    </ul>
                </div>
            );
        }
        return (
            null
        );
    }
});

Search.Tweet = React.createClass({
    render: function () {
        var query = this.props.query;
        var tweet = this.props.tweet;
        var highlights = this.props.response.highlighting;
        var tweetText = tweet.text;
        if (highlights[tweet.id] && highlights[tweet.id].text) {
            tweetText = highlights[tweet.id].text[0];
        }
        return (
            <div className="row tweet">
                <div className="col-md-1">
                    <img className="tweet-profile-image" src={tweet["user.profile_image"]} onError={function(e) {
                        e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_6_normal.png';
                    }}/>
                </div>
                <div className="col-md-11 ">
                    <h6 className="tweet-title">
                        <strong>{tweet["user.name"]}</strong>
                        <small className="text-muted"> @{tweet["user.screen.name"]}</small>
                    </h6>
                    <p className="tweet-text" ref={function(t) {if (t!=null){linkifyElement(t)}}}
                       dangerouslySetInnerHTML={{__html: tweetText}}/>
                </div>
            </div>
        );
    }
});

ReactDOM.render(
    <Search />,
    document.getElementById('search-container')
);