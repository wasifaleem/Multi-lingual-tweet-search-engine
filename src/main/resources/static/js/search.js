var Search = React.createClass({
    getInitialState: function () {
        return {
            jqXHR: null,
            response: {},
            query: "",
            filter: [],
            currentCursor: 1,
            cursors: {1: "*"},
            chartMode: false
        };
    },
    handleQuery: function (event) {
        if (event.type === 'submit') {
            event.preventDefault();
        } else {
            var oldQuery = this.state.query;
            var newQuery = event.target.value;
            this.setState({query: newQuery, filter: [], currentCursor: 1, cursors: {1: "*"}}, function () {
                this.fetchResults(oldQuery);
            });
        }
    },
    buildQuery: function () {
        return JSON.stringify(
            {
                query: this.state.query, // get query from react's state
                filter: this.state.filter, // get filter array from react's state
                facet: { // facet by following
                    hashtag: {terms: 'tweet_hashtags'},
                    lang: {terms: 'lang'},
                    created_at: {
                        type: 'range',
                        field: 'created_at',
                        start: 'NOW-4MONTH',
                        end: 'NOW-1MONTH',
                        gap: '+5DAY'
                    },
                    t_Organization: {terms: 'tag.ORGANIZATION'},
                    t_Person: {terms: 'tag.PERSON'},
                    t_Location: {terms: 'tag.LOCATION'},
                    t_Date: {terms: 'tag.DATE'},
                    t_Misc: {terms: 'tag.MISC'},
                    t_Money: {terms: 'tag.MONEY'},
                    t_Duration: {terms: 'tag.DURATION'},
                    t_Number: {terms: 'tag.NUMBER'},
                    t_Time: {terms: 'tag.TIME'}
                }
            }
        );
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
        var inArray = jQuery.inArray(filterValue, this.state.filter);
        if (inArray !== -1) {
            this.state.filter.splice(inArray, 1);
            console.log('pop');
            console.log(this.state.filter);
        } else {
            this.state.filter.push(filterValue);
            console.log('push');
            console.log(this.state.filter);
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
    toggleChartMode: function () {
        this.setState({chartMode: !this.state.chartMode});
        this.fetchResults()
    },
    render: function () {
        return (
            <div>
                <nav className="navbar navbar-dark navbar-fixed-top bg-inverse">
                    <div id="navbar">
                        <div className="row">
                            <div className="col-md-12">
                                <div className="input-group">
                                    <span className="input-group-btn">
                                        <button onClick={this.toggleChartMode}
                                                className="btn btn-primary" type="button">ChartMode
                                        </button>
                                    </span>
                                    <input autoFocus type="text" className="form-control" id="basic-url"
                                           aria-describedby="basic-input"
                                           value={this.state.query} onChange={this.handleQuery}
                                           placeholder="Search..."/>

                                    <span className="input-group-addon"
                                          id="basic-input">Filters: [{this.state.filter.join(', ')}]</span>

                                </div>
                            </div>

                        </div>
                    </div>
                </nav>
                <div className="container-fluid">
                    {!this.state.chartMode ?
                        <div className="row">
                            <div className="col-md-3 sidebar">
                                <Search.LangFacet onClick={this.addFilter} response={this.state.response}/>
                                <Search.EntitiesFacet onClick={this.addFilter} response={this.state.response}/>
                            </div>
                            <div className="col-md-7 col-md-offset-3 main">
                                <Search.ResultList response={this.state.response}/>
                                <Search.ResultPager onClick={this.handlePager} currentCursor={this.state.currentCursor}
                                                    cursors={this.state.cursors}/>
                            </div>
                            <div className="col-md-2 col-md-offset-10 sidebar">
                                <Search.HashTagFacet onClick={this.addFilter} response={this.state.response}/>
                            </div>
                        </div>
                        :
                        <div className="row charts">
                            <div className="row">
                                <div className="col-md-8 col-md-offset-2">
                                    <h6 className="text-xs-center">Frequency by date</h6>
                                    <Search.DateChart response={this.state.response}/>
                                </div>
                            </div>
                            <hr/>
                            <div className="row">
                                <div className="col-md-8  col-md-offset-2">
                                    <h6 className="text-xs-center">Frequency by hash-tag</h6>
                                    <Search.HashTagChart response={this.state.response}/>
                                </div>
                            </div>
                        </div>
                    }
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
                    <a key={lang.val} className="list-group-item" onClick={this.handleClick}>{lang.val}
                        <span className="label label-info label-pill" style={divStyle}>{lang.count}</span>
                    </a>
                );
            }, this);
            return (
                <div className="sidebar-block">
                    <h6>Lang:</h6>
                    <ul className="list-group">
                        {resultNodes}
                    </ul>
                    <hr/>
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
                    <a key={hashtag.val} className="list-group-item" onClick={this.handleClick}>{'#' + hashtag.val}
                        <span className="label label-info label-pill" style={divStyle}>{hashtag.count}</span>
                    </a>
                );
            }, this);
            return (
                <div className="sidebar-block">
                    <h6>Related Hashtags:</h6>
                    <ul className="list-group">
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

Search.DateChart = React.createClass({
    componentDidUpdate: function () {
        var canvas = ReactDOM.findDOMNode(this.refs.canvas);

        var ctx = canvas.getContext("2d");
        var response = this.props.response;
        if (response.hasOwnProperty('facets') && response.facets.created_at && response.facets.created_at.buckets.length > 0) {
            var dates = response.facets.created_at.buckets;
            var labels = dates.map(function (datesBucket) {
                return new Date(datesBucket.val).toDateString();
            });
            var counts = dates.map(function (datesBucket) {
                return datesBucket.count;
            });
            var chartData = {
                labels: labels,
                datasets: [{
                    data: counts,
                    fillColor: "rgba(151,187,205,0.2)",
                    strokeColor: "rgba(151,187,205,1)",
                    pointColor: "rgba(151,187,205,1)",
                    pointStrokeColor: "#fff",
                    pointHighlightFill: "#fff",
                    pointHighlightStroke: "rgba(151,187,205,1)",
                }]
            };
            var lineChart = new Chart(ctx).Line(chartData);
        }
    },
    render: function () {
        return (
            <canvas ref="canvas"></canvas>
        );
    }
});

Search.HashTagChart = React.createClass({
    componentDidUpdate: function () {
        var canvas = ReactDOM.findDOMNode(this.refs.canvas);
        var ctx = canvas.getContext("2d");
        var response = this.props.response;
        if (response.hasOwnProperty('facets') && response.facets.hashtag && response.facets.hashtag.buckets.length > 0) {
            var hashtags = response.facets.hashtag.buckets;

            var pieData = hashtags.map(function (b) {
                return {label: b.val, value: b.count, color: '#' + Math.floor(Math.random() * 16777215).toString(16)};
            });
            var chart = new Chart(ctx).Pie(pieData);
            ReactDOM.findDOMNode(this.refs.legend).innerHTML = (chart.generateLegend());
            console.log(chart.generateLegend())
        }
    },
    render: function () {
        return (
            <div class="row">
                <div className="col-md-8">
                    <canvas ref="canvas"></canvas>
                </div>
                <div ref="legend" className="chart-legend col-md-4"></div>
            </div>
        );
    }
});

Search.EntitiesFacet = React.createClass({
    handleClick: function (e) {
        jQuery(e.target).toggleClass('active');
        jQuery(e.target.parentNode.parentNode).toggleClass('active');
        this.props.onClick('tag.' + e.target.lastChild.textContent.split('_')[1].toUpperCase() + ":" + e.target.firstChild.textContent);
    },
    render: function () {
        var divStyle = {
            float: 'right'
        };
        var response = this.props.response;
        if (response.hasOwnProperty('facets') && response.facets) {
            var entities = Object.keys(response.facets).filter(function (k) {
                return ~k.indexOf("t_")
            });
            if (entities.length > 0) {
                var resultNodes = entities.map(function (entity, i) {
                    console.log(entity);
                    var entityName = entity.toString();
                    var bucketNodes = response.facets[entityName].buckets.map(function (bucket, i) {
                        return (
                            <a key={bucket.val} className="list-group-item" onClick={this.handleClick}>{bucket.val}
                                <span className="label label-info label-pill" style={divStyle}>{bucket.count}</span>
                                <span className="invisible">{entityName}</span>
                            </a>
                        )
                    }, this);

                    if (bucketNodes.length > 0) {
                        return (
                            <li key={entityName} className="list-group-item" id={entity + i} data-toggle="collapse"
                                data-parent="#entities"
                                href={'#collapse' + i}
                                aria-controls={'collapse' + i}>
                                {entityName.replace('t_', '')}
            <span className="label label-info label-pill"
                  style={divStyle}>{bucketNodes.length}</span>
                                <div id={'collapse' + i} className="list-group collapse" aria-labelledby={entity + i}>
                                    {bucketNodes}
                                </div>
                            </li>
                        )
                    }
                    return (
                        null
                    );
                }, this);
                return (
                    <div className="sidebar-block">
                        <h6>Entities:</h6>
                        <ul id="entities" className="list-group" aria-multiselectable="true">
                            {resultNodes}
                        </ul>
                        <hr/>
                    </div>
                )
            }
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
                    <img className="tweet-profile-image" src={tweet["user.profile_image"]} onError={function (e) {
                e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_6_normal.png';
            }}/>
                </div>
                <div className="col-md-11 ">
                    <h6 className="tweet-title">
                        <strong>{tweet["user.name"]}</strong>
                        <small className="text-muted"> @{tweet["user.screen.name"]}</small>
                    </h6>
                    <p className="tweet-text text-justify" ref={function (t) {
                if (t != null) {
                    linkifyElement(t)
                }
            }}
                       dangerouslySetInnerHTML={{__html: tweetText}}/>
                </div>
            </div>
        );
    }
});

ReactDOM.render(
    <Search />
    ,
    document.getElementById('search-container')
);
Chart.defaults.global.responsive = true;
